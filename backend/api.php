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
        SELECT ce.*, p.*, ce.Activo as codigoActivo
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

    // --- VALIDACIONES DE VIGENCIA DE PROYECTO ---
    $today = date('Y-m-d');
    if (!empty($codigo['FechaInicio']) && $codigo['FechaInicio'] !== '0000-00-00') {
        if ($today < $codigo['FechaInicio']) {
            echo json_encode(['error' => 'La promoción aún no ha iniciado.']);
            return;
        }
    }
    if (!empty($codigo['FechaFin']) && $codigo['FechaFin'] !== '0000-00-00') {
        if ($today > $codigo['FechaFin']) {
            echo json_encode(['error' => 'La promoción ha finalizado (vencida).']);
            return;
        }
    }

    // --- VALIDACIÓN DE PARTICIPACIONES POR CORREO ---
    $limit = 0;
    if (isset($codigo['numeroParticipaciones']) && $codigo['numeroParticipaciones'] > 0) {
        $limit = (int)$codigo['numeroParticipaciones'];
    } elseif (isset($codigo['numeroCodigos']) && $codigo['numeroCodigos'] > 0) {
        $limit = (int)$codigo['numeroCodigos'];
    }

    if ($limit > 0) {
        $stmtCount = safePrepare($mysqli, "
            SELECT COUNT(*) as total 
            FROM tblRegistro r 
            JOIN tblUsuario u ON r.idUsuario = u.idUsuario 
            WHERE u.Correo = ? AND r.idProyecto = ? AND r.Activo = 0
        ");
        $stmtCount->bind_param("si", $email, $codigo['idProyecto']);
        $stmtCount->execute();
        $countRes = $stmtCount->get_result()->fetch_assoc();
        $participations = (int)($countRes['total'] ?? 0);
        
        if ($participations >= $limit) {
            echo json_encode(['error' => 'Tu correo ha alcanzado el límite máximo de participaciones para esta promoción.']);
            return;
        }
    }

    // Escenario: Ya utilizado
    if ($codigo['codigoActivo'] == 0) {
        echo json_encode(['error' => 'Este código de entrada ya ha sido utilizado.']);
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

    $stmt = safePrepare($mysqli, "SELECT ce.*, p.*, ce.Activo as codigoActivo FROM tblCodigoEntrada ce JOIN tblProyecto p ON ce.idProyecto = p.idProyecto WHERE ce.CodigoEntrada = ?");
    $stmt->bind_param("s", $code);
    $stmt->execute();
    $codigo = $stmt->get_result()->fetch_assoc();

    if (!$codigo || $codigo['codigoActivo'] == 0) {
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
            $stmtCS = safePrepare($mysqli, "SELECT * FROM tblCodigoSalida WHERE idCodigoSalida = ?");
            $stmtCS->bind_param("i", $idCS);
            $stmtCS->execute();
            $resCS = $stmtCS->get_result()->fetch_assoc();
            $valCS = $resCS ?: 'N/A';
        } else {
            $stmtCS = safePrepare($mysqli, "SELECT * FROM tblCodigoSalida WHERE idRecompensa = ? AND Activo = 1 LIMIT 1");
            $stmtCS->bind_param("i", $idRecompensa);
            $stmtCS->execute();
            $codigoSalida = $stmtCS->get_result()->fetch_assoc();
            if ($codigoSalida) {
                $idCS = $codigoSalida['idCodigoSalida'];
                $valCS = $codigoSalida;
            } else {
                $valCS = 'N/A';
            }
        }

        // Si es multirecompensa, buscamos los campos específicos de impresión en tblRecompensaProyecto
        if (isset($codigo['multiRecompensa']) && $codigo['multiRecompensa'] == 1) {
            $stmtRP = safePrepare($mysqli, "
                SELECT nombrePdf, ejeX, ejeY, fuenteTexto, colorTexto, numeroPaginas,
                       numeroCodigos, MontoRecarga, ejeX2, ejeY2, ejeX3, ejeY3, ejeX4, ejeY4,
                       ejeXMonto, ejeYMonto, montoVariable, colorTextoMonto, fuenteTextoMonto
                FROM tblRecompensaProyecto 
                WHERE idProyecto = ? AND idRecompensa = ?
            ");
            $stmtRP->bind_param("ii", $codigo['idProyecto'], $idRecompensa);
            $stmtRP->execute();
            $rpConfig = $stmtRP->get_result()->fetch_assoc();
            if ($rpConfig) {
                // Sobrescribir de manera dinámica cualquier campo no nulo ni vacío
                foreach ($rpConfig as $key => $val) {
                    if ($val !== null && $val !== '') {
                        $codigo[$key] = $val;
                    }
                }
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

function setPDFTextColor($pdf, $colorHex) {
    if (empty($colorHex)) {
        $pdf->SetTextColor(0, 0, 0);
        return;
    }
    $colorHex = ltrim($colorHex, '#');
    if (strlen($colorHex) == 6) {
        $r = hexdec(substr($colorHex, 0, 2));
        $g = hexdec(substr($colorHex, 2, 2));
        $b = hexdec(substr($colorHex, 4, 2));
        $pdf->SetTextColor($r, $g, $b);
    } elseif (strlen($colorHex) == 3) {
        $r = hexdec(str_repeat(substr($colorHex, 0, 1), 2));
        $g = hexdec(str_repeat(substr($colorHex, 1, 1), 2));
        $b = hexdec(str_repeat(substr($colorHex, 2, 1), 2));
        $pdf->SetTextColor($r, $g, $b);
    } else {
        $pdf->SetTextColor(0, 0, 0);
    }
}

function generateCouponPDF($proyecto, $codigoSalida) {
    $libPath = '/home/customer/www/prestaprenda.qrewards.com.mx/public_html/restAPI/application/libraries/';
    require_once($libPath . 'fpdf181/fpdf.php');
    require_once($libPath . 'fpdi2/src/autoload.php');

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

    // Aplicar color para los códigos
    setPDFTextColor($pdf, $proyecto['colorTexto'] ?? '#000000');

    // Determinar cuántos códigos imprimir (1 a 4)
    $numCodigos = (int)($proyecto['numeroCodigos'] ?? 1);
    if ($numCodigos < 1) $numCodigos = 1;
    if ($numCodigos > 4) $numCodigos = 4;

    // Código 1
    $pdf->SetFont('Arial', 'B', $proyecto['fuenteTexto'] ?: 12);
    $pdf->SetXY($proyecto['ejeX'] ?: 50, $proyecto['ejeY'] ?: 50);
    $val = is_array($codigoSalida) ? ($codigoSalida['CodigoSalida'] ?? 'N/A') : $codigoSalida;
    $pdf->Write(10, $val);

    // Código 2
    if ($numCodigos >= 2) {
        $pdf->SetFont('Arial', 'B', $proyecto['fuenteTexto'] ?: 12);
        $pdf->SetXY($proyecto['ejeX2'] ?: 50, $proyecto['ejeY2'] ?: 50);
        $val2 = is_array($codigoSalida) ? ($codigoSalida['CodigoSalida2'] ?? '') : '';
        $pdf->Write(10, $val2);
    }

    // Código 3
    if ($numCodigos >= 3) {
        $pdf->SetFont('Arial', 'B', $proyecto['fuenteTexto'] ?: 12);
        $pdf->SetXY($proyecto['ejeX3'] ?: 50, $proyecto['ejeY3'] ?: 50);
        $val3 = is_array($codigoSalida) ? ($codigoSalida['CodigoSalida3'] ?? '') : '';
        $pdf->Write(10, $val3);
    }

    // Código 4
    if ($numCodigos >= 4) {
        $pdf->SetFont('Arial', 'B', $proyecto['fuenteTexto'] ?: 12);
        $pdf->SetXY($proyecto['ejeX4'] ?: 50, $proyecto['ejeY4'] ?: 50);
        $val4 = is_array($codigoSalida) ? ($codigoSalida['CodigoSalida4'] ?? '') : '';
        $pdf->Write(10, $val4);
    }

    // --- IMPRIMIR EL MONTO (SI ES MONTO VARIABLE = 1) ---
    if (isset($proyecto['montoVariable']) && $proyecto['montoVariable'] == 1) {
        $montoImprimir = '';
        if (!empty($proyecto['MontoRecarga'])) {
            $montoImprimir = $proyecto['MontoRecarga'];
        } elseif (!empty($proyecto['monto'])) {
            $montoImprimir = $proyecto['monto'];
        }

        if (!empty($montoImprimir) && !empty($proyecto['ejeXMonto']) && !empty($proyecto['ejeYMonto'])) {
            $fontSizeMonto = $proyecto['fuenteTextoMonto'] ?: ($proyecto['fuenteTexto'] ?: 12);
            $pdf->SetFont('Arial', 'B', $fontSizeMonto);
            
            // Aplicar color para el monto
            setPDFTextColor($pdf, $proyecto['colorTextoMonto'] ?? $proyecto['colorTexto'] ?? '#000000');
            
            $pdf->SetXY($proyecto['ejeXMonto'], $proyecto['ejeYMonto']);
            if (is_numeric($montoImprimir)) {
                $montoFormateado = '$' . number_format((float)$montoImprimir, 2);
            } else {
                $montoFormateado = $montoImprimir;
            }
            $pdf->Write(10, $montoFormateado);
        }
    }

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
    $stmt = safePrepare($mysqli, "SELECT ce.*, p.*, ce.Activo as codigoActivo FROM tblCodigoEntrada ce JOIN tblProyecto p ON ce.idProyecto = p.idProyecto WHERE ce.CodigoEntrada = ?");
    $stmt->bind_param("s", $code);
    $stmt->execute();
    $codigo = $stmt->get_result()->fetch_assoc();

    if (!$codigo || $codigo['codigoActivo'] == 0) {
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
