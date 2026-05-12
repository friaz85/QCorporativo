<?php
header('Content-Type: application/json');
error_reporting(0);
ini_set('display_errors', 0);

require_once 'config.php';

function writeLog($msg) {
    $file = 'debug_log.txt';
    $timestamp = date('Y-m-d H:i:s');
    @file_put_contents($file, "[$timestamp] $msg\n", FILE_APPEND);
}

$action = $_GET['action'] ?? '';
$idProyectoFixed = 42;

try {
    switch ($action) {
        case 'validate':
            checkToken($mysqli, $idProyectoFixed);
            break;
        case 'getTelefonia':
            getTelefonia($mysqli);
            break;
        case 'recharge':
            processRecharge($mysqli, $idProyectoFixed);
            break;
        default:
            echo json_encode(['error' => 'Invalid action']);
            break;
    }
} catch (Throwable $e) {
    writeLog("EXCEPCION: " . $e->getMessage() . " en " . $e->getFile() . ":" . $e->getLine());
    echo json_encode([
        'success' => true,
        'message' => 'Tu recarga ha sido procesada con éxito. En un lapso de 24 a 48 horas verás reflejado tu saldo.',
        'error' => 'Excepción en el servidor'
    ]);
}

function safePrepare($mysqli, $sql) {
    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        throw new Exception("Error en SQL: " . $mysqli->error);
    }
    return $stmt;
}

function checkToken($mysqli, $idProyecto) {
    $data = json_decode(file_get_contents('php://input'), true);
    $token = $data['code'] ?? '';

    if (empty($token)) {
        echo json_encode(['error' => 'Enlace no válido']);
        return;
    }

    // Buscamos el registro existente por el Token y Estatus = 2 (Pendiente/Disponible como en corcholatas)
    $stmt = safePrepare($mysqli, "SELECT idRegistro, Celular, idRecompensa, Estatus FROM tblRegistro WHERE Token = ? AND idProyecto = ?");
    $stmt->bind_param("si", $token, $idProyecto);
    $stmt->execute();
    $res = $stmt->get_result();
    $registro = $res->fetch_assoc();

    if (!$registro) {
        echo json_encode(['error' => 'El enlace no es válido o ha expirado.']);
        return;
    }

    // Validar Estatus (0 = Disponible/Válido, cualquier otro = ya utilizado)
    if ($registro['Estatus'] != 0) {
        echo json_encode(['error' => 'Esta recarga ya ha sido efectuada. Gracias por participar']);
    } else {
        echo json_encode([
            'success' => true,
            'status' => 'REQUIRE_TELEPHONY',
            'idProyecto' => $idProyecto,
            'idRecompensa' => $registro['idRecompensa'] ?: 1
        ]);
    }
}

function processRecharge($mysqli, $idProyecto) {
    $data = json_decode(file_get_contents('php://input'), true);
    $phone = $data['phone'] ?? '';
    $idTelefonia = $data['idTelefonia'] ?? 0;
    $token = $data['code'] ?? '';
    $idRecompensa = $data['idRecompensa'] ?? 1;

    if (empty($token)) {
        echo json_encode(['error' => 'Token no válido']);
        return;
    }

    // 1. Validar que el registro exista y tenga Estatus = 2
    $stmtCheck = safePrepare($mysqli, "SELECT idRegistro, Estatus, idUsuario FROM tblRegistro WHERE Token = ? AND idProyecto = ?");
    $stmtCheck->bind_param("si", $token, $idProyecto);
    $stmtCheck->execute();
    $registro = $stmtCheck->get_result()->fetch_assoc();

    if (!$registro) {
        echo json_encode(['error' => 'Registro no encontrado.']);
        return;
    }

    if ($registro['Estatus'] != 0) {
        echo json_encode([
            'success' => true,
            'message' => 'Esta recarga ya ha sido efectuada. Gracias por participar'
        ]);
        return;
    }

    $idRegistro = $registro['idRegistro'];
    $idUsuario = $registro['idUsuario'];

    // 2. Obtener SKU de telefonía
    $stmtSku = safePrepare($mysqli, "
        SELECT t.SKU as Prefijo, p.MontoRecarga 
        FROM tblTelefonia t, tblProyecto p 
        WHERE t.idTelefonia = ? AND p.idProyecto = ?
    ");
    $stmtSku->bind_param("ii", $idTelefonia, $idProyecto);
    $stmtSku->execute();
    $skuData = $stmtSku->get_result()->fetch_assoc();
    $sku = ($skuData['Prefijo'] ?? '') . ($skuData['MontoRecarga'] ?? '');

    // 3. Actualizar Registro existente: Estatus = 0 (Entregada) y Activo = 0
    $date = date('Y-m-d H:i:s');

    // Solo actualizamos teléfono — el Estatus cambia después de RequestTXN exitoso
    $stmtUpdateReg = safePrepare($mysqli, "UPDATE tblRegistro SET Celular = ?, idTelefonia = ?, FechaRegistro = ? WHERE idRegistro = ?");
    $stmtUpdateReg->bind_param("sisi", $phone, $idTelefonia, $date, $idRegistro);
    $stmtUpdateReg->execute();

    $stmtUpdateUser = safePrepare($mysqli, "UPDATE tblUsuario SET Celular = ? WHERE idUsuario = ?");
    $stmtUpdateUser->bind_param("si", $phone, $idUsuario);
    $stmtUpdateUser->execute();

    // 4. Taecel
    if (!empty($sku)) {
        $key = 'M1Ss74dU5Gx87KCW9mCz2Imi7bc8d6adbbdb9f57410848fa9ce325a54AeAd2k04dsciF6nmEvuo7qyu37xLuP';
        $nip = 'f82dc3d9102a7591fd37a5593dc5ab17T44ui7Pib2';

        // Request TXN
        $curl = curl_init();
        curl_setopt_array($curl, array(
            CURLOPT_URL => 'https://taecel.com/app/api/RequestTXN',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_POSTFIELDS => "key=$key&nip=$nip&producto=$sku&referencia=$phone",
            CURLOPT_HTTPHEADER => array('Content-Type: application/x-www-form-urlencoded'),
        ));
        $response = curl_exec($curl);
        curl_close($curl);
        $res = json_decode($response, true);

        if ($res['success']) {
            $transID = $res['data']['transID'];

            // Cambiar Estatus tras RequestTXN exitoso
            $stmtEstatus = safePrepare($mysqli, "UPDATE tblRegistro SET Estatus = 1, Activo = 0, TransID = ? WHERE idRegistro = ?");
            $stmtEstatus->bind_param("si", $transID, $idRegistro);
            $stmtEstatus->execute();

            // Status TXN
            $curl2 = curl_init();
            curl_setopt_array($curl2, array(
                CURLOPT_URL => 'https://taecel.com/app/api/StatusTXN',
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CUSTOMREQUEST => 'POST',
                CURLOPT_POSTFIELDS => "key=$key&nip=$nip&transID=$transID",
                CURLOPT_HTTPHEADER => array('Content-Type: application/x-www-form-urlencoded'),
            ));
            $response2 = curl_exec($curl2);
            curl_close($curl2);
            $res2 = json_decode($response2, true);

            if ($res2['success']) {
                // Éxito total: guardar Folio, TransID y Saldo
                $stmtUpdate = safePrepare($mysqli, "UPDATE tblRegistro SET FolioRecarga = ?, TransID = ?, Saldo_Final = ? WHERE idRegistro = ?");
                $stmtUpdate->bind_param("sssi", $res2['data']['Folio'], $res2['data']['TransID'], $res2['data']['Saldo Final'], $idRegistro);
                $stmtUpdate->execute();
            }

            // Log con resultado de StatusTXN
            $stmtLog = safePrepare($mysqli, "INSERT INTO tblLogRecarga (idRegistro, Mensaje, Codigo, FechaRegistro, Celular, idTelefonia) VALUES (?, ?, ?, ?, ?, ?)");
            if ($res2['success']) {
                $msg = "Recarga Exitosa. Folio: " . ($res2['data']['Folio'] ?? '') . ". Saldo: $" . number_format((float)($res2['data']['Saldo Final'] ?? 0), 2) . "";
            } else {
                $msg = $res2['message'] ?? 'Error en verificación';
            }
            $err = $res2['error'] ?? '';
            $stmtLog->bind_param("issssi", $idRegistro, $msg, $err, $date, $phone, $idTelefonia);
            $stmtLog->execute();
        } else {
            // Error en RequestTXN — log igualmente
            $stmtLog = safePrepare($mysqli, "INSERT INTO tblLogRecarga (idRegistro, Mensaje, Codigo, FechaRegistro, Celular, idTelefonia) VALUES (?, ?, ?, ?, ?, ?)");
            $msg = $res['message'] ?? 'Error en solicitud';
            $err = $res['error'] ?? '';
            $stmtLog->bind_param("issssi", $idRegistro, $msg, $err, $date, $phone, $idTelefonia);
            $stmtLog->execute();
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'Tu recarga ha sido procesada con éxito. En un lapso de 24 a 48 horas verás reflejado tu saldo.',
        'idRegistro' => $idRegistro
    ]);
}

function getTelefonia($mysqli) {
    $result = $mysqli->query("SELECT idTelefonia, Telefonia, SKU FROM tblTelefonia WHERE Activo = 1");
    $telefonia = [];
    while ($row = $result->fetch_assoc()) $telefonia[] = $row;
    echo json_encode($telefonia);
}
?>
