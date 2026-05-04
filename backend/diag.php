<?php
require_once 'config.php';
header('Content-Type: text/plain');

echo "--- Estructura tblLogRecarga ---\n\n";

$res = $mysqli->query("DESCRIBE tblLogRecarga");
while($r = $res->fetch_assoc()) {
    echo "  - " . $r['Field'] . " (" . $r['Type'] . ")\n";
}

$mysqli->close();
?>
