<?php
// ===================== BEGIN: SOUR DOH FEEDBACK SUBMIT (WITH DB + DEBUG) =====================

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'status'  => 'error',
        'message' => 'Method not allowed. Use POST.'
    ]);
    exit;
}

// TODO: UPDATE THESE 4 VALUES FOR YOUR ENV
$dbHost = 'mysql.heavensleash.com';   // e.g. mysql.yourdomain.com
$dbName = 'sourdoh_feedback';
$dbUser = 'ejinaustin';
$dbPass = '<!bonehead7535!>';

try {
    // Read JSON body (what our JS sends)
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);

    if (!is_array($data)) {
        // Fallback for form-encoded
        $data = $_POST;
    }

    $get = function ($key, $default = null) use ($data) {
        return isset($data[$key]) ? $data[$key] : $default;
    };

    // featuresUsed can be array or single value
    $featuresUsed = $get('featuresUsed');
    if (is_array($featuresUsed)) {
        $featuresUsedStr = implode(', ', $featuresUsed);
    } elseif (is_string($featuresUsed)) {
        $featuresUsedStr = $featuresUsed;
    } else {
        $featuresUsedStr = null;
    }

    $toInt = function ($val) {
        if ($val === null || $val === '' || !is_numeric($val)) return null;
        return (int)$val;
    };

    // Connect to DB
    $dsn = "mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    // IMPORTANT: sourdoh_feedback table must exist
    $sql = "
        INSERT INTO sourdoh_feedback (
          experience_level,
          usage_level,
          features_used,
          mode_used,
          tips_feeling,
          mode_feedback,
          rate_starter,
          rate_planner,
          rate_bakes,
          rate_overall,
          score_out_of_ten,
          what_worked,
          what_didnt_work,
          bugs,
          top_change,
          missing_features,
          would_use_full,
          ok_to_contact,
          email,
          final_notes,
          ip_address,
          user_agent
        ) VALUES (
          :experience_level,
          :usage_level,
          :features_used,
          :mode_used,
          :tips_feeling,
          :mode_feedback,
          :rate_starter,
          :rate_planner,
          :rate_bakes,
          :rate_overall,
          :score_out_of_ten,
          :what_worked,
          :what_didnt_work,
          :bugs,
          :top_change,
          :missing_features,
          :would_use_full,
          :ok_to_contact,
          :email,
          :final_notes,
          :ip_address,
          :user_agent
        )
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':experience_level' => $get('experienceLevel'),
        ':usage_level'      => $get('usageLevel'),
        ':features_used'    => $featuresUsedStr,
        ':mode_used'        => $get('modeUsed'),
        ':tips_feeling'     => $get('tipsFeeling'),
        ':mode_feedback'    => $get('modeFeedback'),
        ':rate_starter'     => $toInt($get('rateStarter')),
        ':rate_planner'     => $toInt($get('ratePlanner')),
        ':rate_bakes'       => $toInt($get('rateBakes')),
        ':rate_overall'     => $toInt($get('rateOverall')),
        ':score_out_of_ten' => $get('scoreOutOfTen'),
        ':what_worked'      => $get('whatWorked'),
        ':what_didnt_work'  => $get('whatDidntWork'),
        ':bugs'             => $get('bugs'),
        ':top_change'       => $get('topChange'),
        ':missing_features' => $get('missingFeatures'),
        ':would_use_full'   => $get('wouldUseFull'),
        ':ok_to_contact'    => $get('okToContact'),
        ':email'            => $get('email'),
        ':final_notes'      => $get('finalNotes'),
        ':ip_address'       => $_SERVER['REMOTE_ADDR'] ?? null,
        ':user_agent'       => $_SERVER['HTTP_USER_AGENT'] ?? null,
    ]);

    echo json_encode(['status' => 'ok']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => $e->getMessage()
    ]);
}
// ===================== END: SOUR DOH FEEDBACK SUBMIT (WITH DB + DEBUG) =====================
