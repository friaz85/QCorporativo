<?php
require_once 'config.php';
$res = $mysqli->query("SELECT Token, Estatus, idProyecto FROM tblRegistro WHERE idProyecto = 42 LIMIT 10");
$data = [];
while($row = $res->fetch_assoc()) $data[] = $row;
echo json_encode($data);
?>
