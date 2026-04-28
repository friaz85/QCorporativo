<?php
require_once 'config.php';

// Cargar librerías PDF
$libPath = '/home/customer/www/prestaprenda.qrewards.com.mx/public_html/restAPI/application/libraries/';
require_once($libPath . 'fpdf/fpdf.php');
require_once($libPath . 'fpdi/src/autoload.php');

use setasign\Fpdi\Fpdi;

$action = $_GET['action'] ?? '';

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

function validateCode($mysqli) {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = $data['email'] ?? '';
    $code = $data['code'] ?? '';

    if (empty($code) || empty($email)) {
        echo json_encode(['error' => 'Código y correo requeridos']);
        return;
    }

    $stmt = $mysqli->prepare("
        SELECT ce.*, p.multiRecompensa, p.nombrePdf, p.ejeX, p.ejeY, p.fuenteTexto, p.colorTexto, p.Proyecto 
        FROM tblCodigoEntrada ce 
        JOIN tblProyecto p ON ce.idProyecto = p.idProyecto 
        WHERE ce.Codigo = ?
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
        $stmtReg = $mysqli->prepare("
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
        $stmtRewards = $mysqli->prepare("
            SELECT r.idRecompensa, r.Nombre, r.TA 
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
        $idCS = $codigo['idCodigoSalida'] ?? 0;
        
        $stmtRec = $mysqli->prepare("SELECT TA, Nombre FROM tblRecompensa WHERE idRecompensa = ?");
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
        $stmtRec = $mysqli->prepare("SELECT TA, Nombre FROM tblRecompensa WHERE idRecompensa = ?");
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

    $stmt = $mysqli->prepare("SELECT ce.*, p.* FROM tblCodigoEntrada ce JOIN tblProyecto p ON ce.idProyecto = p.idProyecto WHERE ce.Codigo = ?");
    $stmt->bind_param("s", $code);
    $stmt->execute();
    $codigo = $stmt->get_result()->fetch_assoc();

    if (!$codigo || $codigo['Activo'] == 0) {
        echo json_encode(['error' => 'Operación no válida']);
        return;
    }

    $stmtRec = $mysqli->prepare("SELECT TA, Nombre FROM tblRecompensa WHERE idRecompensa = ?");
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
    $date = date('Y-m-d H:i:s');
    
    // 1. Usuario
    $stmtUser = $mysqli->prepare("SELECT idUsuario FROM tblUsuario WHERE Correo = ?");
    $stmtUser->bind_param("s", $email);
    $stmtUser->execute();
    $usuario = $stmtUser->get_result()->fetch_assoc();
    
    if ($usuario) {
        $idUsuario = $usuario['idUsuario'];
    } else {
        $stmtInsertUser = $mysqli->prepare("INSERT INTO tblUsuario (Correo, Nombre, Activo, FechaRegistro) VALUES (?, '', 1, ?)");
        $stmtInsertUser->bind_param("ss", $email, $date);
        $stmtInsertUser->execute();
        $idUsuario = $mysqli->insert_id;
    }

    // 2. Obtener Código de Salida
    $idCS = 0;
    $valCS = 'N/A';

    if ($preAssignedCS > 0) {
        $idCS = $preAssignedCS;
        $stmtCS = $mysqli->prepare("SELECT CodigoSalida FROM tblCodigoSalida WHERE idCodigoSalida = ?");
        $stmtCS->bind_param("i", $idCS);
        $stmtCS->execute();
        $resCS = $stmtCS->get_result()->fetch_assoc();
        $valCS = $resCS ? $resCS['CodigoSalida'] : 'N/A';
    } else {
        $stmtCS = $mysqli->prepare("SELECT idCodigoSalida, CodigoSalida FROM tblCodigoSalida WHERE idProyecto = ? AND idRecompensa = ? AND Activo = 1 LIMIT 1");
        $stmtCS->bind_param("ii", $codigo['idProyecto'], $idRecompensa);
        $stmtCS->execute();
        $codigoSalida = $stmtCS->get_result()->fetch_assoc();
        if ($codigoSalida) {
            $idCS = $codigoSalida['idCodigoSalida'];
            $valCS = $codigoSalida['CodigoSalida'];
        }
    }

    // 3. Generar PDF
    $pdfUrl = generateCouponPDF($codigo, $valCS);

    // 4. Registrar en tblRegistro
    $token = bin2hex(openssl_random_pseudo_bytes(80));
    $token2 = hash('ripemd320', $token);
    
    $stmtInsertReg = $mysqli->prepare("INSERT INTO tblRegistro (idUsuario, idCodigoEntrada, idCodigoSalida, FechaRegistro, Token, ArchivoRecompensa, idProyecto) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmtInsertReg->bind_param("iiisssi", $idUsuario, $codigo['idCodigoEntrada'], $idCS, $date, $token2, $pdfUrl, $codigo['idProyecto']);
    $stmtInsertReg->execute();

    // 5. Quemar códigos
    $stmtUpdateCE = $mysqli->prepare("UPDATE tblCodigoEntrada SET Activo = 0, FechaAsignado = ? WHERE idCodigoEntrada = ?");
    $stmtUpdateCE->bind_param("si", $date, $codigo['idCodigoEntrada']);
    $stmtUpdateCE->execute();

    if ($idCS > 0) {
        $stmtUpdateCS = $mysqli->prepare("UPDATE tblCodigoSalida SET Activo = 0, FechaAsignado = ? WHERE idCodigoSalida = ?");
        $stmtUpdateCS->bind_param("si", $date, $idCS);
        $stmtUpdateCS->execute();
    }

    return [
        'success' => true,
        'status' => 'SUCCESS',
        'pdfUrl' => $pdfUrl,
        'message' => '¡Felicidades! Tu cupón ha sido generado.'
    ];
}

function generateCouponPDF($proyecto, $codigoSalida) {
    $templatePath = '/home/customer/www/prestaprenda.qrewards.com.mx/public_html/restAPI/qpn/' . $proyecto['nombrePdf'];
    
    if (!file_exists($templatePath)) {
        return "pdfs/not_found.pdf";
    }

    $pdf = new Fpdi();
    $pdf->setSourceFile($templatePath);
    $tplIdx = $pdf->importPage(1);
    $size = $pdf->getTemplateSize($tplIdx);
    $pdf->AddPage('P', array($size['width'], $size['height']));
    $pdf->useTemplate($tplIdx);

    $pdf->SetFont('Arial', 'B', $proyecto['fuenteTexto'] ?: 12);
    $pdf->SetTextColor(0, 0, 0); 
    $pdf->SetXY($proyecto['ejeX'] ?: 50, $proyecto['ejeY'] ?: 50);
    $pdf->Write(10, $codigoSalida);

    $fileName = 'pdfs/coupon_' . time() . '_' . rand(1000, 9999) . '.pdf';
    $pdf->Output($fileName, 'F');

    return $fileName;
}

function getTelefonia($mysqli) {
    $result = $mysqli->query("SELECT idTelefonia, Nombre, SKU FROM tblTelefonia");
    $telefonia = [];
    while ($row = $result->fetch_assoc()) $telefonia[] = $row;
    echo json_encode($telefonia);
}

function processRecharge($mysqli) {
    // Implementación pendiente de Taecel pero con la misma lógica de registro final
    echo json_encode(['error' => 'Not implemented yet']);
}
?>
