<?php
require_once 'config.php';

$action = $_GET['action'] ?? '';

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
    case 'get_rewards':
        getRewards($mysqli);
        break;
    case 'get_users':
        getUsers($mysqli);
        break;
    case 'get_codes':
        getCodes($mysqli);
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

function adminLogin($mysqli) {
    $data = json_decode(file_get_contents('php://input'), true);
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

function getRewards($mysqli) {
    $res = $mysqli->query("SELECT * FROM tblRecompensa ORDER BY idRecompensa DESC");
    $data = [];
    while($row = $res->fetch_assoc()) $data[] = $row;
    echo json_encode($data);
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

    $type = $_POST['type'] ?? 'entrada';
    $file = $_FILES['file']['tmp_name'];
    $handle = fopen($file, 'r');
    
    // Skip header
    fgetcsv($handle);
    
    $count = 0;
    $errors = 0;
    
    while (($data = fgetcsv($handle)) !== FALSE) {
        if (count($data) < 3) continue;
        
        $code = $data[0];
        $idProj = (int)$data[1];
        $idRec = (int)$data[2];
        
        if ($type === 'entrada') {
            $stmt = $mysqli->prepare("INSERT IGNORE INTO tblCodigoEntrada (Codigo, idProyecto, idRecompensa, Activo) VALUES (?, ?, ?, 1)");
        } else {
            $stmt = $mysqli->prepare("INSERT IGNORE INTO tblCodigoSalida (CodigoSalida, idProyecto, idRecompensa, Activo) VALUES (?, ?, ?, 1)");
        }
        
        $stmt->bind_param("sii", $code, $idProj, $idRec);
        if ($stmt->execute() && $mysqli->affected_rows > 0) {
            $count++;
        } else {
            $errors++;
        }
    }
    
    fclose($handle);
    echo json_encode(['success' => true, 'imported' => $count, 'errors' => $errors]);
}
?>
