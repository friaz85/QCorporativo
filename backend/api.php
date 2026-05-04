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

try {
    switch ($action) {
        case 'validate':
            validateCode($mysqli);
            break;
        case 'getTelefonia':
            getTelefonia($mysqli);
            break;
        case 'recharge':
            processRecharge($mysqli);
            break;
        case 'selectReward':
            selectReward($mysqli);
            break;
        default:
            echo json_encode(['error' => 'Invalid action']);
            break;
    }
} catch (Throwable $e) {
    writeLog("EXCEPCION: " . $e->getMessage() . " en " . $e->getFile() . ":" . $e->getLine());
    echo json_encode([
        'error' => 'Excepción en el servidor',
        'details' => $e->getMessage() . (isset($mysqli) ? ' | SQL Error: ' . $mysqli->error : ''),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ]);
}

function verifyRecaptcha($token) {
    if (empty($token)) return false;
    
    $secret = '6Leil88sAAAAACyDg96_CR7mTZGHiYQG_C7ToydA';
    $url = 'https://www.google.com/recaptcha/api/siteverify';
    $data = [
        'secret' => $secret,
        'response' => $token
    ];

    $options = [
        'http' => [
            'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
            'method'  => 'POST',
            'content' => http_build_query($data)
        ]
    ];
    $context  = stream_context_create($options);
    $response = file_get_contents($url, false, $context);
    
    if ($response === false) {
        throw new Exception("Error al conectar con los servidores de Google reCAPTCHA.");
    }

    $result = json_decode($response, true);
    if (!($result['success'] ?? false)) {
        $errorCodes = isset($result['error-codes']) ? implode(', ', $result['error-codes']) : 'Desconocido';
        throw new Exception("reCAPTCHA Error: " . $errorCodes);
    }

    return true;
}

function safePrepare($mysqli, $sql) {
    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        throw new Exception("Error en SQL: " . $mysqli->error . " | Query: " . trim(preg_replace('/\s+/', ' ', $sql)));
    }
    return $stmt;
}

function validateCode($mysqli) {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = $data['email'] ?? '';
    $code = $data['code'] ?? '';
    $recaptchaToken = $data['captcha'] ?? '';

    if (empty($code) || empty($email)) {
        echo json_encode(['error' => 'Código y correo requeridos']);
        return;
    }

    verifyRecaptcha($recaptchaToken);

    $stmt = safePrepare($mysqli, "
        SELECT ce.*, p.multiRecompensa, p.nombrePdf, p.ejeX, p.ejeY, p.fuenteTexto, p.colorTexto, p.Proyecto 
        FROM tblCodigoEntrada ce 
        JOIN tblProyecto p ON ce.idProyecto = p.idProyecto 
        WHERE ce.CodigoEntrada = ?
    ");

    $stmt->bind_param("s", $code);
    $stmt->execute();
    $codigo = $stmt->get_result()->fetch_assoc();

    if (!$codigo) {
        echo json_encode(['error' => 'Código no encontrado']);
        return;
    }

    // Escenario: Ya utilizado
    if ($codigo['Activo'] == 0) {
        $stmtReg = safePrepare($mysqli, "
            SELECT r.*, u.Correo 
            FROM tblRegistro r 
            JOIN tblUsuario u ON r.idUsuario = u.idUsuario 
            WHERE r.idCodigoEntrada = ? AND u.Correo = ?
        ");
        $stmtReg->bind_param("is", $codigo['idCodigoEntrada'], $email);
        $stmtReg->execute();
        $registroExistente = $stmtReg->get_result()->fetch_assoc();

        if ($registroExistente) {
            echo json_encode([
                'success' => true,
                'status' => 'ALREADY_REDEEMED',
                'pdfUrl' => $registroExistente['ArchivoRecompensa'],
                'message' => 'Tu cupón ya fue generado anteriormente.'
            ]);
        } else {
            echo json_encode(['error' => 'Este código ya fue utilizado por otro usuario.']);
        }
        return;
    }

    // Escenario: Nuevo Canje (Activo = 1)
    
    // CASO 1: Multirecompensa (El usuario elige)
    if ($codigo['multiRecompensa'] == 1) {
        $stmtRewards = safePrepare($mysqli, "
            SELECT r.idRecompensa, r.Recompensa, r.TA 
            FROM tblRecompensa r 
            JOIN tblRecompensaProyecto rp ON r.idRecompensa = rp.idRecompensa 
            WHERE rp.idProyecto = ?
        ");
        $stmtRewards->bind_param("i", $codigo['idProyecto']);
        $stmtRewards->execute();
        $resRewards = $stmtRewards->get_result();
        $rewards = [];
        while($row = $resRewards->fetch_assoc()) $rewards[] = $row;

        echo json_encode([
            'success' => true,
            'status' => 'MULTI_REWARD',
            'rewards' => $rewards,
            'idProyecto' => $codigo['idProyecto']
        ]);
        return;
    }

    // CASO 2: Recompensa Directa (Ya viene asignada en tblCodigoEntrada)
    if ($codigo['multiRecompensa'] == 2) {
        $idRecompensa = $codigo['idRecompensa'];
        $idCS = $codigo['idCodigoSalida'] ?? 0; // Se asume que este campo existe o se agregará
        
        $stmtRec = safePrepare($mysqli, "SELECT TA, Recompensa FROM tblRecompensa WHERE idRecompensa = ?");
        $stmtRec->bind_param("i", $idRecompensa);
        $stmtRec->execute();
        $recompensa = $stmtRec->get_result()->fetch_assoc();

        if ($recompensa['TA'] == 1) {
            echo json_encode([
                'success' => true,
                'status' => 'REQUIRE_TELEPHONY',
                'idProyecto' => $codigo['idProyecto'],
                'idRecompensa' => $idRecompensa
            ]);
        } else {
            $result = finalizeRedemption($mysqli, $codigo, $email, $idRecompensa, $idCS);
            echo json_encode($result);
        }
        return;
    }

    // CASO 0: Individual (Sistema asigna idCodigoSalida)
    if ($codigo['multiRecompensa'] == 0) {
        $idRecompensa = $codigo['idRecompensa'];
        $stmtRec = safePrepare($mysqli, "SELECT TA, Recompensa FROM tblRecompensa WHERE idRecompensa = ?");
        $stmtRec->bind_param("i", $idRecompensa);
        $stmtRec->execute();
        $recompensa = $stmtRec->get_result()->fetch_assoc();

        if ($recompensa['TA'] == 1) {
            echo json_encode([
                'success' => true,
                'status' => 'REQUIRE_TELEPHONY',
                'idProyecto' => $codigo['idProyecto'],
                'idRecompensa' => $idRecompensa
            ]);
        } else {
            $result = finalizeRedemption($mysqli, $codigo, $email, $idRecompensa);
            echo json_encode($result);
        }
    }
}

function selectReward($mysqli) {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = $data['email'] ?? '';
    $code = $data['code'] ?? '';
    $idRecompensa = $data['idRecompensa'] ?? 0;

    $stmt = safePrepare($mysqli, "SELECT ce.*, p.* FROM tblCodigoEntrada ce JOIN tblProyecto p ON ce.idProyecto = p.idProyecto WHERE ce.CodigoEntrada = ?");
    $stmt->bind_param("s", $code);
    $stmt->execute();
    $codigo = $stmt->get_result()->fetch_assoc();

    if (!$codigo || $codigo['Activo'] == 0) {
        echo json_encode(['error' => 'Operación no válida']);
        return;
    }

    $stmtRec = safePrepare($mysqli, "SELECT TA, Recompensa FROM tblRecompensa WHERE idRecompensa = ?");
    $stmtRec->bind_param("i", $idRecompensa);
    $stmtRec->execute();
    $recompensa = $stmtRec->get_result()->fetch_assoc();

    if ($recompensa['TA'] == 1) {
        echo json_encode([
            'success' => true,
            'status' => 'REQUIRE_TELEPHONY',
            'idProyecto' => $codigo['idProyecto'],
            'idRecompensa' => $idRecompensa
        ]);
    } else {
        $result = finalizeRedemption($mysqli, $codigo, $email, $idRecompensa);
        echo json_encode($result);
    }
}

function finalizeRedemption($mysqli, $codigo, $email, $idRecompensa, $preAssignedCS = 0) {
    writeLog("Iniciando finalizeRedemption para $email, Recompensa: $idRecompensa");
    $date = date('Y-m-d H:i:s');
    
    // 1. Usuario
    $stmtUser = safePrepare($mysqli, "SELECT idUsuario FROM tblUsuario WHERE Correo = ?");
    $stmtUser->bind_param("s", $email);
    $stmtUser->execute();
    $usuario = $stmtUser->get_result()->fetch_assoc();
    
    if ($usuario) {
        $idUsuario = $usuario['idUsuario'];
    } else {
        $stmtInsertUser = safePrepare($mysqli, "INSERT INTO tblUsuario (Correo, Nombre, Activo, FechaRegistro) VALUES (?, '', 1, ?)");
        $stmtInsertUser->bind_param("ss", $email, $date);
        $stmtInsertUser->execute();
        $idUsuario = $mysqli->insert_id;
    }

    // 2. Obtener Código de Salida (Solo si NO es Tiempo Aire)
    $stmtCheckTA = safePrepare($mysqli, "SELECT TA FROM tblRecompensa WHERE idRecompensa = ?");
    $stmtCheckTA->bind_param("i", $idRecompensa);
    $stmtCheckTA->execute();
    $recData = $stmtCheckTA->get_result()->fetch_assoc();
    $isTA = ($recData['TA'] == 1);

    $idCS = 0;
    $valCS = 'N/A';
    $pdfUrl = '';

    if (!$isTA) {
        if ($preAssignedCS > 0) {
            $idCS = $preAssignedCS;
            $stmtCS = safePrepare($mysqli, "SELECT CodigoSalida FROM tblCodigoSalida WHERE idCodigoSalida = ?");
            $stmtCS->bind_param("i", $idCS);
            $stmtCS->execute();
            $resCS = $stmtCS->get_result()->fetch_assoc();
            $valCS = $resCS ? $resCS['CodigoSalida'] : 'N/A';
        } else {
            $stmtCS = safePrepare($mysqli, "SELECT idCodigoSalida, CodigoSalida FROM tblCodigoSalida WHERE idProyecto = ? AND idRecompensa = ? AND Activo = 1 LIMIT 1");
            $stmtCS->bind_param("ii", $codigo['idProyecto'], $idRecompensa);
            $stmtCS->execute();
            $codigoSalida = $stmtCS->get_result()->fetch_assoc();
            if ($codigoSalida) {
                $idCS = $codigoSalida['idCodigoSalida'];
                $valCS = $codigoSalida['CodigoSalida'];
            }
        }

        // 3. Generar PDF (Solo si NO es Tiempo Aire)
        writeLog("Generando PDF para Proyecto: " . $codigo['idProyecto']);
        $pdfUrl = generateCouponPDF($codigo, $valCS);
        writeLog("PDF Generado: $pdfUrl");
    } else {
        writeLog("Es Tiempo Aire: Saltando PDF y CodigoSalida");
    }

    // 4. Registrar en tblRegistro
    $token = bin2hex(openssl_random_pseudo_bytes(80));
    $token2 = hash('ripemd320', $token);
    
    $stmtInsertReg = safePrepare($mysqli, "INSERT INTO tblRegistro (idUsuario, idCodigoEntrada, idCodigoSalida, FechaRegistro, Token, ArchivoRecompensa, idProyecto) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmtInsertReg->bind_param("iiisssi", $idUsuario, $codigo['idCodigoEntrada'], $idCS, $date, $token2, $pdfUrl, $codigo['idProyecto']);
    $stmtInsertReg->execute();
    $idReg = $mysqli->insert_id;
    writeLog("Registro creado en tblRegistro. ID: $idReg");

    // 5. Quemar códigos
    $stmtUpdateCE = safePrepare($mysqli, "UPDATE tblCodigoEntrada SET Activo = 0, FechaAsignado = ? WHERE idCodigoEntrada = ?");
    $stmtUpdateCE->bind_param("si", $date, $codigo['idCodigoEntrada']);
    $stmtUpdateCE->execute();

    if ($idCS > 0) {
        $stmtUpdateCS = safePrepare($mysqli, "UPDATE tblCodigoSalida SET Activo = 0, FechaAsignado = ? WHERE idCodigoSalida = ?");
        $stmtUpdateCS->bind_param("si", $date, $idCS);
        $stmtUpdateCS->execute();
    }

    return [
        'success' => true,
        'status' => 'SUCCESS',
        'pdfUrl' => $pdfUrl,
        'idRegistro' => $idReg,
        'message' => '¡Felicidades! Tu cupón ha sido generado.'
    ];
}

function generateCouponPDF($proyecto, $codigoSalida) {
    // Cargar librerías PDF de forma diferida (lazy load)
    $libPath = '/home/customer/www/prestaprenda.qrewards.com.mx/public_html/restAPI/application/libraries/';
    require_once($libPath . 'fpdf181/fpdf.php');
    require_once($libPath . 'fpdi/src/autoload.php');

    $templatePath = '/home/customer/www/prestaprenda.qrewards.com.mx/public_html/restAPI/qpn/' . $proyecto['nombrePdf'];
    
    if (!file_exists($templatePath)) {
        return "https://prestaprenda.qrewards.com.mx/restAPI/pdfs/not_found.pdf";
    }

    $pdf = new \setasign\Fpdi\Fpdi();
    $pdf->setSourceFile($templatePath);
    $tplIdx = $pdf->importPage(1);
    $size = $pdf->getTemplateSize($tplIdx);
    $pdf->AddPage('P', array($size['width'], $size['height']));
    $pdf->useTemplate($tplIdx);

    $pdf->SetFont('Arial', 'B', $proyecto['fuenteTexto'] ?: 12);
    $pdf->SetTextColor(0, 0, 0); 
    $pdf->SetXY($proyecto['ejeX'] ?: 50, $proyecto['ejeY'] ?: 50);
    $pdf->Write(10, $codigoSalida);

    $outputDir = '/home/customer/www/prestaprenda.qrewards.com.mx/public_html/restAPI/pdfs/';
    $fileName = 'coupon_' . time() . '_' . rand(1000, 9999) . '.pdf';
    $fullPath = $outputDir . $fileName;
    
    $pdf->Output($fullPath, 'F');

    // Retornamos la URL pública para la descarga
    return 'https://prestaprenda.qrewards.com.mx/restAPI/pdfs/' . $fileName;
}

function getTelefonia($mysqli) {
    $result = $mysqli->query("SELECT idTelefonia, Telefonia, SKU FROM tblTelefonia WHERE Activo = 1");
    $telefonia = [];
    while ($row = $result->fetch_assoc()) $telefonia[] = $row;
    echo json_encode($telefonia);
}

function processRecharge($mysqli) {
    $data = json_decode(file_get_contents('php://input'), true);
    $phone = $data['phone'] ?? '';
    $idTelefonia = $data['idTelefonia'] ?? 0;
    $code = $data['code'] ?? '';
    $email = $data['email'] ?? '';
    $idRecompensa = $data['idRecompensa'] ?? 0;

    // 1. Validar código y obtener datos
    $stmt = safePrepare($mysqli, "SELECT ce.*, p.* FROM tblCodigoEntrada ce JOIN tblProyecto p ON ce.idProyecto = p.idProyecto WHERE ce.CodigoEntrada = ?");
    $stmt->bind_param("s", $code);
    $stmt->execute();
    $codigo = $stmt->get_result()->fetch_assoc();

    if (!$codigo || $codigo['Activo'] == 0) {
        echo json_encode(['error' => 'Este código ya ha sido procesado o no es válido.']);
        return;
    }

    // 2. Obtener SKU de telefonía y CodigoRecarga de recompensa
    $stmtSku = safePrepare($mysqli, "
        SELECT t.SKU as Prefijo, r.CodigoRecarga 
        FROM tblTelefonia t, tblRecompensa r 
        WHERE t.idTelefonia = ? AND r.idRecompensa = ?
    ");
    $stmtSku->bind_param("ii", $idTelefonia, $idRecompensa);
    $stmtSku->execute();
    $skuData = $stmtSku->get_result()->fetch_assoc();
    
    $sku = ($skuData['Prefijo'] ?? '') . ($skuData['CodigoRecarga'] ?? '');

    if (empty($sku)) {
        echo json_encode(['error' => 'Configuración de recarga no válida (SKU incompleto)']);
        return;
    }

    // 3. Registrar preventivamente en la base de datos
    $result = finalizeRedemption($mysqli, $codigo, $email, $idRecompensa);
    if (!$result['success']) {
        echo json_encode($result);
        return;
    }
    $idRegistro = $result['idRegistro'];

    // Actualizamos con datos de telefonía en tblRegistro y tblUsuario
    $stmtUpdateReg = safePrepare($mysqli, "UPDATE tblRegistro SET Celular = ?, idTelefonia = ? WHERE idRegistro = ?");
    $stmtUpdateReg->bind_param("sii", $phone, $idTelefonia, $idRegistro);
    $stmtUpdateReg->execute();

    $stmtUpdateUser = safePrepare($mysqli, "UPDATE tblUsuario u JOIN tblRegistro r ON u.idUsuario = r.idUsuario SET u.Celular = ? WHERE r.idRegistro = ?");
    $stmtUpdateUser->bind_param("si", $phone, $idRegistro);
    $stmtUpdateUser->execute();

    // 4. Integración con Taecel (Producción)
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
        
        // Status TXN
        $curl = curl_init();
        curl_setopt_array($curl, array(
            CURLOPT_URL => 'https://taecel.com/app/api/StatusTXN',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_POSTFIELDS => "key=$key&nip=$nip&transID=$transID",
            CURLOPT_HTTPHEADER => array('Content-Type: application/x-www-form-urlencoded'),
        ));
        $response2 = curl_exec($curl);
        curl_close($curl);
        $res2 = json_decode($response2, true);

        if ($res2['success']) {
            // Éxito Total
            $stmtUpdate = safePrepare($mysqli, "UPDATE tblRegistro SET FolioRecarga = ?, TransID = ?, Saldo_Final = ? WHERE idRegistro = ?");
            $stmtUpdate->bind_param("sssi", $res2['data']['Folio'], $res2['data']['TransID'], $res2['data']['Saldo Final'], $idRegistro);
            $stmtUpdate->execute();
            
            $result['message'] = "Recarga exitosa. Folio: " . $res2['data']['Folio'];
        } else {
            // Error en Status
            $result['success'] = false;
            $result['error'] = $res2['error'];
            $result['message'] = $res2['message'];
        }
        
        // Log
        $date = date('Y-m-d H:i:s');
        $stmtLog = safePrepare($mysqli, "INSERT INTO tblLogRecarga (idRegistro, Mensaje, Codigo, FechaRegistro, Celular, idTelefonia) VALUES (?, ?, ?, ?, ?, ?)");
        $stmtLog->bind_param("issssi", $idRegistro, $res2['message'], $res2['error'], $date, $phone, $idTelefonia);
        $stmtLog->execute();

    } else {
        // Error en Request
        $result['success'] = false;
        $result['error'] = $res['error'];
        $result['message'] = $res['message'];
        
        $date = date('Y-m-d H:i:s');
        $stmtLog = safePrepare($mysqli, "INSERT INTO tblLogRecarga (idRegistro, Mensaje, Codigo, FechaRegistro, Celular, idTelefonia) VALUES (?, ?, ?, ?, ?, ?)");
        $stmtLog->bind_param("issssi", $idRegistro, $res['message'], $res['error'], $date, $phone, $idTelefonia);
        $stmtLog->execute();
    }

    echo json_encode($result);
}
?>
