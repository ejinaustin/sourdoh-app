<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

$dbHost = 'mysql.heavensleash.com';   // e.g. mysql.yourdomain.com
$dbName = 'sourdoh_feedback';
$dbUser = 'ejinaustin';
$dbPass = '<!bonehead7535!>';

try {
    $dsn = "mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    echo "DB CONNECT OK";
} catch (Throwable $e) {
    echo "DB ERROR: " . $e->getMessage();
}
