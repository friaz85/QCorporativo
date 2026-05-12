<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$libPath = '/home/customer/www/prestaprenda.qrewards.com.mx/public_html/restAPI/application/libraries/';
echo "Loading FPDF...<br>";
require_once($libPath . 'fpdf181/fpdf.php');
echo "FPDF Loaded.<br>";
echo "Loading FPDI...<br>";
require_once($libPath . 'fpdi2/src/autoload.php');
echo "FPDI Loaded.<br>";

use setasign\Fpdi\Fpdi;
$pdf = new Fpdi();
echo "Fpdi instance created!";
?>
