<?php
// ===================== BEGIN: SOUR DOH FEEDBACK VIEWER =====================
ini_set('display_errors', 1);
error_reporting(E_ALL);

// COPY THESE FROM sourdoh-feedback-submit.php SO THEY MATCH
$dbHost = 'mysql.heavensleash.com';   // e.g. mysql.yourdomain.com
$dbName = 'sourdoh_feedback';
$dbUser = 'ejinaustin';
$dbPass = '<!bonehead7535!>';

try {
    $dsn = "mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    // Get the newest first – cap at 500 for now
    $stmt = $pdo->query("
        SELECT
          id,
          submitted_at,
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
        FROM sourdoh_feedback
        ORDER BY submitted_at DESC, id DESC
        LIMIT 500
    ");
    $rows = $stmt->fetchAll();
} catch (Throwable $e) {
    http_response_code(500);
    echo "<h1>DB Error</h1><pre>" . htmlspecialchars($e->getMessage()) . "</pre>";
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sour D'oh! – Feedback Log</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #020617;
      color: #e5e7eb;
      padding: 1.5rem;
    }
    .shell {
      max-width: 1200px;
      margin: 0 auto;
      background: #020617;
    }
    h1 {
      margin-top: 0;
      font-size: 1.6rem;
    }
    .meta {
      font-size: 0.85rem;
      color: #9ca3af;
      margin-bottom: 1rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
      border-radius: 10px;
      overflow: hidden;
      background: #020617;
      border: 1px solid #374151;
    }
    thead {
      background: #111827;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    th, td {
      border-bottom: 1px solid #1f2933;
      padding: 0.45rem 0.6rem;
      vertical-align: top;
      text-align: left;
    }
    th {
      font-weight: 600;
      white-space: nowrap;
    }
    tr:nth-child(even) td {
      background: #030712;
    }
    tr:hover td {
      background: #111827;
    }
    .pill {
      display: inline-block;
      padding: 0.1rem 0.4rem;
      border-radius: 999px;
      font-size: 0.7rem;
      border: 1px solid #4b5563;
      background: #020617;
      color: #e5e7eb;
    }
    .small {
      font-size: 0.7rem;
      color: #9ca3af;
    }
    .nowrap {
      white-space: nowrap;
    }
    .prewrap {
      white-space: pre-wrap;
    }
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .tag {
      font-size: 0.75rem;
      padding: 0.25rem 0.6rem;
      border-radius: 999px;
      border: 1px solid #4b5563;
      color: #a5b4fc;
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="top-bar">
      <div>
        <h1>Sour D'oh! – Feedback Log</h1>
        <div class="meta">
          Showing latest <?= count($rows) ?> responses from <code>sourdoh_feedback</code>.
        </div>
      </div>
      <div class="tag">Internal view – not for users</div>
    </div>

    <?php if (empty($rows)): ?>
      <p>No feedback yet. Go bully your beta testers. 😈</p>
    <?php else: ?>
      <div style="overflow-x:auto; max-height: 80vh; border-radius: 10px;">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th class="nowrap">Submitted</th>
              <th>Experience</th>
              <th>Usage</th>
              <th>Features</th>
              <th>Mode / Tips</th>
              <th>Ratings</th>
              <th>What worked</th>
              <th>What didn’t</th>
              <th>Bugs</th>
              <th>Top change</th>
              <th>Missing</th>
              <th>Would use?</th>
              <th>Contact</th>
              <th>Meta</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($rows as $r): ?>
              <tr>
                <td class="nowrap"><?= (int)$r['id'] ?></td>
                <td class="nowrap small">
                  <?= htmlspecialchars($r['submitted_at'] ?? '') ?>
                </td>
                <td class="small">
                  <div><strong>Exp:</strong> <?= htmlspecialchars($r['experience_level'] ?? '') ?></div>
                </td>
                <td class="small">
                  <?= htmlspecialchars($r['usage_level'] ?? '') ?>
                </td>
                <td class="small prewrap">
                  <?= htmlspecialchars($r['features_used'] ?? '') ?>
                </td>
                <td class="small prewrap">
                  <div><strong>Mode:</strong> <?= htmlspecialchars($r['mode_used'] ?? '') ?></div>
                  <div><strong>Tips:</strong> <?= htmlspecialchars($r['tips_feeling'] ?? '') ?></div>
                  <?php if (!empty($r['mode_feedback'])): ?>
                  <div class="small prewrap"><?= nl2br(htmlspecialchars($r['mode_feedback'])) ?></div>
                  <?php endif; ?>
                </td>
                <td class="small">
                  <div>Starter: <?= htmlspecialchars($r['rate_starter'] ?? '') ?></div>
                  <div>Planner: <?= htmlspecialchars($r['rate_planner'] ?? '') ?></div>
                  <div>Bakes: <?= htmlspecialchars($r['rate_bakes'] ?? '') ?></div>
                  <div>Overall: <?= htmlspecialchars($r['rate_overall'] ?? '') ?></div>
                  <div class="small">/10: <?= htmlspecialchars($r['score_out_of_ten'] ?? '') ?></div>
                </td>
                <td class="small prewrap">
                  <?= nl2br(htmlspecialchars($r['what_worked'] ?? '')) ?>
                </td>
                <td class="small prewrap">
                  <?= nl2br(htmlspecialchars($r['what_didnt_work'] ?? '')) ?>
                </td>
                <td class="small prewrap">
                  <?= nl2br(htmlspecialchars($r['bugs'] ?? '')) ?>
                </td>
                <td class="small prewrap">
                  <?= nl2br(htmlspecialchars($r['top_change'] ?? '')) ?>
                </td>
                <td class="small prewrap">
                  <?= nl2br(htmlspecialchars($r['missing_features'] ?? '')) ?>
                </td>
                <td class="small">
                  <div><?= htmlspecialchars($r['would_use_full'] ?? '') ?></div>
                </td>
                <td class="small">
                  <div>Ok?: <?= htmlspecialchars($r['ok_to_contact'] ?? '') ?></div>
                  <div><?= htmlspecialchars($r['email'] ?? '') ?></div>
                </td>
                <td class="small prewrap">
                  <div>IP: <?= htmlspecialchars($r['ip_address'] ?? '') ?></div>
                  <div>UA: <?= htmlspecialchars(substr($r['user_agent'] ?? '', 0, 60)) ?><?= strlen($r['user_agent'] ?? '') > 60 ? '…' : '' ?></div>
                </td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    <?php endif; ?>
  </div>
</body>
</html>
<!-- ===================== END: SOUR DOH FEEDBACK VIEWER ===================== -->
