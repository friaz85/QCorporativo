<?php
require_once 'config.php';

header('Content-Type: text/plain');

$tableName = 'tblRecompensaProyecto';

// Campos a duplicar/agregar
$fieldsToAdd = [
    'nombrePdf' => "VARCHAR(255) NULL DEFAULT NULL",
    'ejeX' => "INT NULL DEFAULT NULL",
    'ejeY' => "INT NULL DEFAULT NULL",
    'fuenteTexto' => "INT NULL DEFAULT NULL",
    'colorTexto' => "VARCHAR(50) NULL DEFAULT NULL",
    'numeroPaginas' => "INT NULL DEFAULT NULL",
    'numeroCodigos' => "INT NULL DEFAULT NULL",
    'MontoRecarga' => "DECIMAL(10,2) NULL DEFAULT NULL",
    'ejeX2' => "INT NULL DEFAULT NULL",
    'ejeY2' => "INT NULL DEFAULT NULL",
    'ejeX3' => "INT NULL DEFAULT NULL",
    'ejeY3' => "INT NULL DEFAULT NULL",
    'ejeX4' => "INT NULL DEFAULT NULL",
    'ejeY4' => "INT NULL DEFAULT NULL",
    'ejeXMonto' => "INT NULL DEFAULT NULL",
    'ejeYMonto' => "INT NULL DEFAULT NULL",
    'montoVariable' => "TINYINT(1) NULL DEFAULT 0",
    'colorTextoMonto' => "VARCHAR(50) NULL DEFAULT NULL",
    'fuenteTextoMonto' => "INT NULL DEFAULT NULL",
    'esQr' => "TINYINT(1) NULL DEFAULT 0",
    'tamanoQr' => "INT NULL DEFAULT 35",
    'ejeXQr' => "INT NULL DEFAULT NULL",
    'ejeYQr' => "INT NULL DEFAULT NULL"
];

echo "Iniciando migración para la tabla: $tableName\n\n";

// 1. Obtener columnas existentes
$existingColumns = [];
$res = $mysqli->query("SHOW COLUMNS FROM `$tableName`");
if (!$res) {
    die("Error al consultar la estructura de la tabla: " . $mysqli->error . "\n");
}
while ($row = $res->fetch_assoc()) {
    $existingColumns[] = strtolower($row['Field']);
}

// 2. Agregar las columnas faltantes a tblRecompensaProyecto
foreach ($fieldsToAdd as $column => $definition) {
    if (!in_array(strtolower($column), $existingColumns)) {
        $sql = "ALTER TABLE `$tableName` ADD COLUMN `$column` $definition";
        echo "Ejecutando: $sql ... ";
        if ($mysqli->query($sql)) {
            echo "OK\n";
        } else {
            echo "ERROR: " . $mysqli->error . "\n";
        }
    } else {
        echo "La columna `$column` ya existe en `$tableName` (Saltando)\n";
    }
}

// 2.1 Migración para tblProyecto (esQr, tamanoQr, ejeXQr, ejeYQr)
$projTableName = 'tblProyecto';
echo "\nIniciando migración para la tabla: $projTableName\n";
$projColumns = [];
$resProj = $mysqli->query("SHOW COLUMNS FROM `$projTableName`");
if ($resProj) {
    while ($row = $resProj->fetch_assoc()) {
        $projColumns[] = strtolower($row['Field']);
    }
    $projFields = [
        'esQr' => "TINYINT(1) NULL DEFAULT 0",
        'tamanoQr' => "INT NULL DEFAULT 35",
        'ejeXQr' => "INT NULL DEFAULT NULL",
        'ejeYQr' => "INT NULL DEFAULT NULL"
    ];
    foreach ($projFields as $col => $def) {
        if (!in_array(strtolower($col), $projColumns)) {
            $sql = "ALTER TABLE `$projTableName` ADD COLUMN `$col` $def";
            echo "Ejecutando: $sql ... ";
            if ($mysqli->query($sql)) {
                echo "OK\n";
            } else {
                echo "ERROR: " . $mysqli->error . "\n";
            }
        } else {
            echo "La columna `$col` ya existe en `$projTableName` (Saltando)\n";
        }
    }
}

// 3. Migración para tblRegistro (FechaDescarga)
$regTableName = 'tblRegistro';
echo "\nIniciando migración para la tabla: $regTableName\n";
$regExistingColumns = [];
$resReg = $mysqli->query("SHOW COLUMNS FROM `$regTableName`");
if ($resReg) {
    while ($row = $resReg->fetch_assoc()) {
        $regExistingColumns[] = strtolower($row['Field']);
    }
    if (!in_array('fechadescarga', $regExistingColumns)) {
        $sql = "ALTER TABLE `$regTableName` ADD COLUMN `FechaDescarga` DATETIME NULL DEFAULT NULL";
        echo "Ejecutando: $sql ... ";
        if ($mysqli->query($sql)) {
            echo "OK\n";
        } else {
            echo "ERROR: " . $mysqli->error . "\n";
        }
    } else {
        echo "La columna `FechaDescarga` ya existe en `$regTableName` (Saltando)\n";
    }
} else {
    echo "ERROR al consultar $regTableName: " . $mysqli->error . "\n";
}

echo "\nMigración finalizada.\n";
?>
