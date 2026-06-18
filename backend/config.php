<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Encrypted");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}

date_default_timezone_set('Etc/GMT+6');

$db_config = [
    'hostname' => 'localhost',
    'username' => 'u9iut9rkejrvz',
    'password' => 'df(b2bf%ff3c',
    'database' => 'db9olsrf7dbigq'
];

$mysqli = new mysqli($db_config['hostname'], $db_config['username'], $db_config['password'], $db_config['database']);

if ($mysqli->connect_error) {
    die(json_encode(['error' => 'Connection failed: ' . $mysqli->connect_error]));
}

$mysqli->set_charset("utf8");
$mysqli->query("SET time_zone = '-06:00'");

// --- TRANSPARENT ENCRYPTION / DECRYPTION SETUP ---
define('AES_KEY_B64', 'xuZEy8dYLzEcWfIElAec3T7TA0TOVPvcrO9wAGgEka4=');

function encryptDB($plaintext) {
    if (empty($plaintext)) return $plaintext;
    $key = base64_decode(AES_KEY_B64);
    $iv = random_bytes(16);
    $ciphertext = openssl_encrypt($plaintext, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
    return base64_encode($iv . $ciphertext);
}

function decryptDB($ciphertextB64) {
    if (empty($ciphertextB64)) return $ciphertextB64;
    $key = base64_decode(AES_KEY_B64);
    $decoded = base64_decode($ciphertextB64, true);
    if ($decoded === false || strlen($decoded) < 17) return $ciphertextB64;
    $iv = substr($decoded, 0, 16);
    $ciphertext = substr($decoded, 16);
    $plaintext = openssl_decrypt($ciphertext, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
    return $plaintext !== false ? $plaintext : $ciphertextB64;
}

function getDecryptedInput() {
    static $parsed = null;
    if ($parsed !== null) return $parsed;

    $raw = file_get_contents('php://input');
    if (isset($_SERVER['HTTP_X_ENCRYPTED']) && $_SERVER['HTTP_X_ENCRYPTED'] === '1' && !empty($raw)) {
        $envelope = json_decode($raw, true);
        if (isset($envelope['d'])) {
            $decoded = base64_decode($envelope['d'], true);
            if ($decoded !== false && strlen($decoded) >= 17) {
                $iv = substr($decoded, 0, 16);
                $ciphertext = substr($decoded, 16);
                $key = base64_decode(AES_KEY_B64);
                $plaintext = openssl_decrypt($ciphertext, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
                if ($plaintext !== false) {
                    $parsed = json_decode($plaintext, true);
                    return $parsed;
                }
            }
        }
    }
    $parsed = json_decode($raw, true);
    return $parsed;
}

// Request Interception for Outgoing responses
$action = $_GET['action'] ?? '';
$isEncryptedRequest = (isset($_SERVER['HTTP_X_ENCRYPTED']) && $_SERVER['HTTP_X_ENCRYPTED'] === '1' && $action !== 'get_pdf' && $action !== 'download_layout' && $action !== 'upload_reward_image');
if ($isEncryptedRequest) {
    ob_start();
    register_shutdown_function(function() {
        $output = ob_get_clean();
        if (!empty($output)) {
            $iv = random_bytes(16);
            $key = base64_decode(AES_KEY_B64);
            $ciphertext = openssl_encrypt($output, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
            $encoded = base64_encode($iv . $ciphertext);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['d' => $encoded]);
        }
    });
}
