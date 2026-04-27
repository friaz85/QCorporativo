<?php
require_once 'config.php';

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
    default:
        echo json_encode(['error' => 'Invalid action']);
        break;
}

function validateCode($mysqli) {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = $data['email'] ?? '';
    $code = $data['code'] ?? '';

    if (empty($code)) {
        echo json_encode(['error' => 'Código requerido']);
        return;
    }

    $stmt = $mysqli->prepare("SELECT idCodigoEntrada, idProyecto, idRecompensa, Activo FROM tblCodigoEntrada WHERE Codigo = ?");
    $stmt->bind_param("s", $code);
    $stmt->execute();
    $result = $stmt->get_result();
    $codigo = $result->fetch_assoc();

    if (!$codigo) {
        echo json_encode(['error' => 'Código no encontrado']);
        return;
    }

    if ($codigo['Activo'] == 0) {
        echo json_encode(['error' => 'código utilizado']);
        return;
    }

    // Consultar Recompensa para ver si requiere TA
    $idRecompensa = $codigo['idRecompensa'];
    $stmt = $mysqli->prepare("SELECT TA, Nombre FROM tblRecompensa WHERE idRecompensa = ?");
    $stmt->bind_param("i", $idRecompensa);
    $stmt->execute();
    $recompensa = $stmt->get_result()->fetch_assoc();

    echo json_encode([
        'success' => true,
        'idProyecto' => $codigo['idProyecto'],
        'idRecompensa' => $idRecompensa,
        'requiresTelephony' => ($recompensa['TA'] == 1),
        'recompensaNombre' => $recompensa['Nombre']
    ]);
}

function getTelefonia($mysqli) {
    $result = $mysqli->query("SELECT idTelefonia, Nombre, SKU FROM tblTelefonia");
    $telefonia = [];
    while ($row = $result->fetch_assoc()) {
        $telefonia[] = $row;
    }
    echo json_encode($telefonia);
}

function processRecharge($mysqli) {
    $data = json_decode(file_get_contents('php://input'), true);
    $idTelefonia = $data['idTelefonia'] ?? 0;
    $telefono = $data['telefono'] ?? '';
    $idRegistro = $data['idRegistro'] ?? 0; // Necesitamos un ID de registro previo o crear uno

    // Implementación de la lógica de Taecel proporcionada
    // Primero obtenemos el SKU de la telefonía
    $query = sprintf("SELECT * FROM tblTelefonia WHERE idTelefonia = %s;", $idTelefonia);
    if (!$result = $mysqli->query($query)) {
        echo json_encode(['error' => 'Error al obtener telefonía']);
        exit;
    }
    $registro = $result->fetch_assoc();

    $curl = curl_init();
    curl_setopt_array($curl, array(
        CURLOPT_URL            => 'https://taecel.com/app/api/RequestTXN',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING       => '',
        CURLOPT_MAXREDIRS      => 10,
        CURLOPT_TIMEOUT        => 0,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION   => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST  => 'POST',
        CURLOPT_POSTFIELDS     => 'key=M1Ss74dU5Gx87KCW9mCz2Imi7bc8d6adbbdb9f57410848fa9ce325a54AeAd2k04dsciF6nmEvuo7qyu37xLuP&nip=f82dc3d9102a7591fd37a5593dc5ab17T44ui7Pib2&producto=' . $registro['SKU'] . '&referencia=' . $telefono,
        CURLOPT_HTTPHEADER     => array(
            'Content-Type: application/x-www-form-urlencoded',
            'Cookie: cksid=WSCK-59t8sY1IdA7PaJx8VM4h1un39pJA5N-3aXwjpvk7IVey5Y6dUSibUNzYWYHx3-549e981913c568351329130364afc8a2'
        ),
    ));

    $response = curl_exec($curl);
    curl_close($curl);
    $res = json_decode($response, true);

    $success = $res['success'] ?? false;

    if ($success) {
        // Consultar StatusTXN
        $curl = curl_init();
        curl_setopt_array($curl, array(
            CURLOPT_URL            => 'https://taecel.com/app/api/StatusTXN',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => 'POST',
            CURLOPT_POSTFIELDS     => 'key=M1Ss74dU5Gx87KCW9mCz2Imi7bc8d6adbbdb9f57410848fa9ce325a54AeAd2k04dsciF6nmEvuo7qyu37xLuP&nip=f82dc3d9102a7591fd37a5593dc5ab17T44ui7Pib2&transID=' . $res['data']['transID'],
            CURLOPT_HTTPHEADER     => array(
                'Content-Type: application/x-www-form-urlencoded',
                'Cookie: cksid=WSCK-59t8sY1IdA7PaJx8VM4h1un39pJA5N-3aXwjpvk7IVey5Y6dUSibUNzYWYHx3-549e981913c568351329130364afc8a2'
            ),
        ));
        $response2 = curl_exec($curl);
        curl_close($curl);
        $res2 = json_decode($response2, true);
        
        echo json_encode(['success' => $res2['success'], 'message' => $res2['message'], 'data' => $res2['data'] ?? null]);
    } else {
        echo json_encode(['success' => false, 'message' => $res['message'] ?? 'Error desconocido', 'error' => $res['error'] ?? '']);
    }
}
?>
