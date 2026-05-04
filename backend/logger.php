<?php
function writeLog($msg) {
    $file = 'debug_log.txt';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($file, "[$timestamp] $msg\n", FILE_APPEND);
}

require_once 'config.php';
// ... resto del api.php ...
?>
