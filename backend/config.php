<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}

date_default_timezone_set('America/Mexico_City');

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
?>
