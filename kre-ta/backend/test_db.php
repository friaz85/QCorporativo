<?php
require_once 'config.php';
if ($mysqli->connect_error) {
    echo "Connection failed: " . $mysqli->connect_error;
} else {
    echo "Connection successful!";
}
?>
