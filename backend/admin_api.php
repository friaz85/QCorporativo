<?php
require_once 'config.php';

header('Content-Type: application/json');
error_reporting(0);
ini_set('display_errors', 0);

$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'login':
            adminLogin($mysqli);
            break;
        case 'dashboard_stats':
            getDashboardStats($mysqli);
            break;
        case 'get_projects':
            getProjects($mysqli);
            break;
        case 'save_project':
            saveProject($mysqli);
            break;
        case 'delete_project':
            deleteProject($mysqli);
            break;
        case 'get_rewards':
            getRewards($mysqli);
            break;
        case 'save_reward':
            saveReward($mysqli);
            break;
        case 'delete_reward':
            deleteReward($mysqli);
            break;
        case 'get_project_rewards':
            getProjectRewards($mysqli);
            break;
        case 'save_project_rewards':
            saveProjectRewards($mysqli);
            break;
        case 'get_users':
            getUsers($mysqli);
            break;
        case 'get_codes':
            getCodes($mysqli);
            break;
        case 'get_exit_codes':
            getExitCodes($mysqli);
            break;
        case 'add_exit_codes':
            addExitCodes($mysqli);
            break;
        case 'delete_exit_code':
            deleteExitCode($mysqli);
            break;
        case 'download_layout':
            downloadLayout();
            break;
        case 'upload_codes':
            uploadCodes($mysqli);
            break;
        default:
            echo json_encode(['error' => 'Action not found']);
            break;
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Error en el servidor',
        'details' => $e->getMessage()
    ]);
}

function safePrepare($mysqli, $sql) {
    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        throw new Exception("Error en SQL: " . $mysqli->error . " | Query: " . trim($sql));
    }
    return $stmt;
}

function adminLogin($mysqli) {
    $data = getDecryptedInput();
    $user = $data['username'] ?? '';
    $pass = $data['password'] ?? '';

    if ($user === 'admin' && $pass === 'quantum2026') {
        echo json_encode([
            'id' => 1,
            'name' => 'Administrador Quantum',
            'token' => 'fake-jwt-token',
            'role' => 'SUPERADMIN'
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid credentials']);
    }
}

function getDashboardStats($mysqli) {
    $stats = [
        'totalRedemptions' => $mysqli->query("SELECT COUNT(*) FROM tblRegistro")->fetch_row()[0],
        'availableCodes' => $mysqli->query("SELECT COUNT(*) FROM tblCodigoEntrada WHERE Activo = 1")->fetch_row()[0],
        'activeProjects' => $mysqli->query("SELECT COUNT(*) FROM tblProyecto WHERE Activo = 1")->fetch_row()[0],
        'totalUsers' => $mysqli->query("SELECT COUNT(*) FROM tblUsuario")->fetch_row()[0]
    ];
    echo json_encode($stats);
}

function getProjects($mysqli) {
    $res = $mysqli->query("SELECT * FROM tblProyecto ORDER BY idProyecto DESC");
    $data = [];
    while($row = $res->fetch_assoc()) $data[] = $row;
    echo json_encode($data);
}

function saveProject($mysqli) {
    $data = getDecryptedInput();
    $id = isset($data['idProyecto']) ? (int)$data['idProyecto'] : 0;

    $fields = [
        'Proyecto' => $data['Proyecto'] ?? '',
        'multiRecompensa' => (int)($data['multiRecompensa'] ?? 0),
        'nombrePdf' => $data['nombrePdf'] ?? null,
        'ejeX' => $data['ejeX'] ?? null,
        'ejeY' => $data['ejeY'] ?? null,
        'ejeX2' => $data['ejeX2'] ?? null,
        'ejeY2' => $data['ejeY2'] ?? null,
        'ejeX3' => $data['ejeX3'] ?? null,
        'ejeY3' => $data['ejeY3'] ?? null,
        'ejeX4' => $data['ejeX4'] ?? null,
        'ejeY4' => $data['ejeY4'] ?? null,
        'ejeXMonto' => $data['ejeXMonto'] ?? null,
        'ejeYMonto' => $data['ejeYMonto'] ?? null,
        'montoVariable' => $data['montoVariable'] ?? '0',
        'fuenteTexto' => $data['fuenteTexto'] ?? null,
        'colorTexto' => $data['colorTexto'] ?? null,
        'fuenteTextoMonto' => $data['fuenteTextoMonto'] ?? null,
        'colorTextoMonto' => $data['colorTextoMonto'] ?? null,
        'MontoRecarga' => $data['MontoRecarga'] ?? null,
        'numeroPaginas' => isset($data['numeroPaginas']) ? (int)$data['numeroPaginas'] : 1,
        'numeroCodigos' => isset($data['numeroCodigos']) ? (int)$data['numeroCodigos'] : 1,
        'numeroParticipaciones' => isset($data['numeroParticipaciones']) ? (int)$data['numeroParticipaciones'] : 1,
        'FechaInicio' => !empty($data['FechaInicio']) ? $data['FechaInicio'] : null,
        'FechaFin' => !empty($data['FechaFin']) ? $data['FechaFin'] : null,
        'Activo' => (int)($data['Activo'] ?? 1)
    ];

    if ($id > 0) {
        // Update
        $sql = "UPDATE tblProyecto SET 
                Proyecto = ?, multiRecompensa = ?, nombrePdf = ?, 
                ejeX = ?, ejeY = ?, ejeX2 = ?, ejeY2 = ?, ejeX3 = ?, ejeY3 = ?, ejeX4 = ?, ejeY4 = ?, 
                ejeXMonto = ?, ejeYMonto = ?, montoVariable = ?, fuenteTexto = ?, colorTexto = ?, 
                fuenteTextoMonto = ?, colorTextoMonto = ?, MontoRecarga = ?, numeroPaginas = ?, 
                numeroCodigos = ?, numeroParticipaciones = ?, FechaInicio = ?, FechaFin = ?, Activo = ?
                WHERE idProyecto = ?";
        $stmt = safePrepare($mysqli, $sql);
        $stmt->bind_param(
            "sisssssssssssssssssiiissii",
            $fields['Proyecto'], $fields['multiRecompensa'], $fields['nombrePdf'],
            $fields['ejeX'], $fields['ejeY'], $fields['ejeX2'], $fields['ejeY2'], $fields['ejeX3'], $fields['ejeY3'], $fields['ejeX4'], $fields['ejeY4'],
            $fields['ejeXMonto'], $fields['ejeYMonto'], $fields['montoVariable'], $fields['fuenteTexto'], $fields['colorTexto'],
            $fields['fuenteTextoMonto'], $fields['colorTextoMonto'], $fields['MontoRecarga'], $fields['numeroPaginas'],
            $fields['numeroCodigos'], $fields['numeroParticipaciones'], $fields['FechaInicio'], $fields['FechaFin'], $fields['Activo'],
            $id
        );
        $stmt->execute();
        echo json_encode(['success' => true, 'idProyecto' => $id]);
    } else {
        // Insert
        $sql = "INSERT INTO tblProyecto (
                    Proyecto, multiRecompensa, nombrePdf, 
                    ejeX, ejeY, ejeX2, ejeY2, ejeX3, ejeY3, ejeX4, ejeY4, 
                    ejeXMonto, ejeYMonto, montoVariable, fuenteTexto, colorTexto, 
                    fuenteTextoMonto, colorTextoMonto, MontoRecarga, numeroPaginas, 
                    numeroCodigos, numeroParticipaciones, FechaInicio, FechaFin, Activo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = safePrepare($mysqli, $sql);
        $stmt->bind_param(
            "sisssssssssssssssssiiissi",
            $fields['Proyecto'], $fields['multiRecompensa'], $fields['nombrePdf'],
            $fields['ejeX'], $fields['ejeY'], $fields['ejeX2'], $fields['ejeY2'], $fields['ejeX3'], $fields['ejeY3'], $fields['ejeX4'], $fields['ejeY4'],
            $fields['ejeXMonto'], $fields['ejeYMonto'], $fields['montoVariable'], $fields['fuenteTexto'], $fields['colorTexto'],
            $fields['fuenteTextoMonto'], $fields['colorTextoMonto'], $fields['MontoRecarga'], $fields['numeroPaginas'],
            $fields['numeroCodigos'], $fields['numeroParticipaciones'], $fields['FechaInicio'], $fields['FechaFin'], $fields['Activo']
        );
        $stmt->execute();
        echo json_encode(['success' => true, 'idProyecto' => $mysqli->insert_id]);
    }
}

function deleteProject($mysqli) {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) throw new Exception("ID inválido");

    // Opcional: Eliminar sus relaciones
    $mysqli->query("DELETE FROM tblRecompensaProyecto WHERE idProyecto = $id");

    $stmt = safePrepare($mysqli, "DELETE FROM tblProyecto WHERE idProyecto = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    echo json_encode(['success' => true]);
}

function getRewards($mysqli) {
    $res = $mysqli->query("SELECT idRecompensa, Recompensa as Nombre, Monto, TA, CodigoRecarga, Mensaje, Activo FROM tblRecompensa ORDER BY idRecompensa DESC");
    $data = [];
    while($row = $res->fetch_assoc()) $data[] = $row;
    echo json_encode($data);
}

function saveReward($mysqli) {
    $data = getDecryptedInput();
    $id = isset($data['idRecompensa']) ? (int)$data['idRecompensa'] : 0;

    $fields = [
        'Nombre' => $data['Nombre'] ?? '',
        'Monto' => $data['Monto'] ?? '0.00',
        'TA' => (int)($data['TA'] ?? 0),
        'CodigoRecarga' => $data['CodigoRecarga'] ?? null,
        'Mensaje' => $data['Mensaje'] ?? '',
        'Activo' => (int)($data['Activo'] ?? 1)
    ];

    if ($id > 0) {
        $stmt = safePrepare($mysqli, "UPDATE tblRecompensa SET Recompensa = ?, Monto = ?, TA = ?, CodigoRecarga = ?, Mensaje = ?, Activo = ? WHERE idRecompensa = ?");
        $stmt->bind_param("ssissii", $fields['Nombre'], $fields['Monto'], $fields['TA'], $fields['CodigoRecarga'], $fields['Mensaje'], $fields['Activo'], $id);
        $stmt->execute();
        echo json_encode(['success' => true, 'idRecompensa' => $id]);
    } else {
        $stmt = safePrepare($mysqli, "INSERT INTO tblRecompensa (Recompensa, Monto, TA, CodigoRecarga, Mensaje, Activo) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssissi", $fields['Nombre'], $fields['Monto'], $fields['TA'], $fields['CodigoRecarga'], $fields['Mensaje'], $fields['Activo']);
        $stmt->execute();
        echo json_encode(['success' => true, 'idRecompensa' => $mysqli->insert_id]);
    }
}

function deleteReward($mysqli) {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) throw new Exception("ID inválido");

    $mysqli->query("DELETE FROM tblRecompensaProyecto WHERE idRecompensa = $id");

    $stmt = safePrepare($mysqli, "DELETE FROM tblRecompensa WHERE idRecompensa = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    echo json_encode(['success' => true]);
}

function getProjectRewards($mysqli) {
    $idProyecto = (int)($_GET['idProyecto'] ?? 0);
    if ($idProyecto <= 0) throw new Exception("Proyecto ID requerido");

    $stmt = safePrepare($mysqli, "
        SELECT rp.*, r.Recompensa as Nombre 
        FROM tblRecompensaProyecto rp 
        JOIN tblRecompensa r ON rp.idRecompensa = r.idRecompensa 
        WHERE rp.idProyecto = ?
    ");
    $stmt->bind_param("i", $idProyecto);
    $stmt->execute();
    $res = $stmt->get_result();
    $data = [];
    while($row = $res->fetch_assoc()) {
        $data[] = $row;
    }
    echo json_encode($data);
}

function saveProjectRewards($mysqli) {
    $data = getDecryptedInput();
    $idProyecto = (int)($data['idProyecto'] ?? 0);
    if ($idProyecto <= 0) throw new Exception("Proyecto ID inválido");

    // Iniciar transacción
    $mysqli->begin_transaction();

    // Eliminar las relaciones previas
    $mysqli->query("DELETE FROM tblRecompensaProyecto WHERE idProyecto = $idProyecto");

    $rewards = $data['rewards'] ?? [];
    foreach ($rewards as $r) {
        $idRecompensa = (int)$r['idRecompensa'];
        $activo = (int)($r['Activo'] ?? 1);
        $numCodigos = (int)($r['numeroCodigos'] ?? 1);
        $nombrePdf = $r['nombrePdf'] ?? null;
        $ejeX = $r['ejeX'] ?? null;
        $ejeY = $r['ejeY'] ?? null;
        $ejeX2 = $r['ejeX2'] ?? null;
        $ejeY2 = $r['ejeY2'] ?? null;
        $ejeX3 = $r['ejeX3'] ?? null;
        $ejeY3 = $r['ejeY3'] ?? null;
        $ejeX4 = $r['ejeX4'] ?? null;
        $ejeY4 = $r['ejeY4'] ?? null;
        $ejeXMonto = $r['ejeXMonto'] ?? null;
        $ejeYMonto = $r['ejeYMonto'] ?? null;
        $montoVariable = (int)($r['montoVariable'] ?? 0);
        $fuenteTexto = (int)($r['fuenteTexto'] ?? 12);
        $colorTexto = $r['colorTexto'] ?? null;
        $colorTextoMonto = $r['colorTextoMonto'] ?? null;
        $fuenteTextoMonto = (int)($r['fuenteTextoMonto'] ?? 12);
        $montoRecarga = $r['MontoRecarga'] ?? null;
        $numeroPaginas = (int)($r['numeroPaginas'] ?? 1);

        $sql = "INSERT INTO tblRecompensaProyecto (
                    idProyecto, idRecompensa, Activo, numeroCodigos, nombrePdf, 
                    ejeX, ejeY, ejeX2, ejeY2, ejeX3, ejeY3, ejeX4, ejeY4, 
                    ejeXMonto, ejeYMonto, montoVariable, fuenteTexto, colorTexto, 
                    colorTextoMonto, fuenteTextoMonto, MontoRecarga, numeroPaginas
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = safePrepare($mysqli, $sql);
        $stmt->bind_param(
            "iiiisssssssssssisssisi",
            $idProyecto, $idRecompensa, $activo, $numCodigos, $nombrePdf,
            $ejeX, $ejeY, $ejeX2, $ejeY2, $ejeX3, $ejeY3, $ejeX4, $ejeY4,
            $ejeXMonto, $ejeYMonto, $montoVariable, $fuenteTexto, $colorTexto,
            $colorTextoMonto, $fuenteTextoMonto, $montoRecarga, $numeroPaginas
        );
        $stmt->execute();
    }

    $mysqli->commit();
    echo json_encode(['success' => true]);
}

function getUsers($mysqli) {
    $res = $mysqli->query("SELECT * FROM tblUsuario ORDER BY idUsuario DESC");
    $data = [];
    while($row = $res->fetch_assoc()) $data[] = $row;
    echo json_encode($data);
}

function getCodes($mysqli) {
    $res = $mysqli->query("SELECT * FROM tblCodigoEntrada ORDER BY idCodigoEntrada DESC LIMIT 1000");
    $data = [];
    while($row = $res->fetch_assoc()) $data[] = $row;
    echo json_encode($data);
}

function downloadLayout() {
    $type = $_GET['type'] ?? 'entrada';
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="layout_' . $type . '.csv"');
    
    $output = fopen('php://output', 'w');
    if ($type === 'entrada') {
        fputcsv($output, ['Codigo', 'idProyecto', 'idRecompensa']);
        fputcsv($output, ['EJEMPLO123', '1', '1']);
    } else {
        fputcsv($output, ['CodigoSalida', 'idProyecto', 'idRecompensa']);
        fputcsv($output, ['CUPON999', '1', '1']);
    }
    fclose($output);
    exit;
}

function uploadCodes($mysqli) {
    if (!isset($_FILES['file'])) {
        echo json_encode(['error' => 'No file uploaded']);
        return;
    }

    $type = $_POST['type'] ?? $_GET['type'] ?? 'entrada';
    $file = $_FILES['file']['tmp_name'];
    $handle = fopen($file, 'r');
    
    // Skip header
    fgetcsv($handle);
    
    $count = 0;
    $errors = 0;
    
    while (($data = fgetcsv($handle)) !== FALSE) {
        if (count($data) < 3) continue;
        
        $code = trim($data[0]);
        $idProj = (int)$data[1];
        $idRec = (int)$data[2];
        
        if ($type === 'entrada') {
            $stmt = $mysqli->prepare("INSERT IGNORE INTO tblCodigoEntrada (Codigo, idProyecto, idRecompensa, Activo) VALUES (?, ?, ?, 1)");
            $stmt->bind_param("sii", $code, $idProj, $idRec);
        } else {
            $encryptedCode = encryptDB($code);
            $stmt = $mysqli->prepare("INSERT IGNORE INTO tblCodigoSalida (CodigoSalida, idProyecto, idRecompensa, Activo) VALUES (?, ?, ?, 1)");
            $stmt->bind_param("sii", $encryptedCode, $idProj, $idRec);
        }
        
        if ($stmt->execute() && $mysqli->affected_rows > 0) {
            $count++;
        } else {
            $errors++;
        }
    }
    
    fclose($handle);
    echo json_encode(['success' => true, 'imported' => $count, 'errors' => $errors]);
}

function getExitCodes($mysqli) {
    $idRecompensa = (int)($_GET['idRecompensa'] ?? 0);
    $idProyecto = (int)($_GET['idProyecto'] ?? 0);
    if ($idRecompensa <= 0) throw new Exception("ID Recompensa requerido");

    $sql = "SELECT * FROM tblCodigoSalida WHERE idRecompensa = ? ";
    if ($idProyecto > 0) {
        $sql .= " AND idProyecto = ? ";
    }
    $sql .= " ORDER BY idCodigoSalida DESC LIMIT 1000";

    $stmt = safePrepare($mysqli, $sql);
    if ($idProyecto > 0) {
        $stmt->bind_param("ii", $idRecompensa, $idProyecto);
    } else {
        $stmt->bind_param("i", $idRecompensa);
    }
    $stmt->execute();
    $res = $stmt->get_result();
    $data = [];
    while ($row = $res->fetch_assoc()) {
        for ($i = 1; $i <= 8; $i++) {
            $colName = "CodigoSalida" . ($i === 1 ? "" : $i);
            if (isset($row[$colName])) {
                $row[$colName] = decryptDB($row[$colName]);
            }
        }
        $data[] = $row;
    }
    echo json_encode($data);
}

function addExitCodes($mysqli) {
    $data = getDecryptedInput();
    $idRecompensa = (int)($data['idRecompensa'] ?? 0);
    $idProyecto = (int)($data['idProyecto'] ?? 0);
    $codes = $data['codes'] ?? []; // Array de arrays

    if ($idRecompensa <= 0 || $idProyecto <= 0 || empty($codes)) {
        throw new Exception("Parámetros requeridos inválidos");
    }

    $count = 0;
    $errors = 0;

    foreach ($codes as $row) {
        if (empty($row)) continue;
        
        $vals = [];
        for ($i = 0; $i < 8; $i++) {
            $val = isset($row[$i]) ? trim($row[$i]) : null;
            $vals[] = $val ? encryptDB($val) : null;
        }

        $stmt = safePrepare($mysqli, "INSERT IGNORE INTO tblCodigoSalida (
            idProyecto, idRecompensa, CodigoSalida, CodigoSalida2, CodigoSalida3,
            CodigoSalida4, CodigoSalida5, CodigoSalida6, CodigoSalida7, CodigoSalida8, Activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)");

        $stmt->bind_param(
            "iissssssss",
            $idProyecto, $idRecompensa,
            $vals[0], $vals[1], $vals[2], $vals[3],
            $vals[4], $vals[5], $vals[6], $vals[7]
        );

        if ($stmt->execute() && $mysqli->affected_rows > 0) {
            $count++;
        } else {
            $errors++;
        }
    }

    echo json_encode(['success' => true, 'imported' => $count, 'errors' => $errors]);
}

function deleteExitCode($mysqli) {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) throw new Exception("ID inválido");
    $stmt = safePrepare($mysqli, "DELETE FROM tblCodigoSalida WHERE idCodigoSalida = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    echo json_encode(['success' => true]);
}
?>
