<html>
  <head>
    <meta charset="utf-8">
    <title>MyGame</title>
    <link rel="stylesheet" href="../test_css/styles.css" type="text/css" media="screen"> <!-- Verlinkung CSS -->
    <script src="https://unpkg.com/@cityofzion/neon-js@next"></script>
    <script src="../js/login.js" type="text/javascript"></script> <!-- Verlinkung JavaScript -->
    <script src="//ajax.googleapis.com/ajax/libs/jquery/1.8.0/jquery.min.js"></script> <!-- Verlinkung AJAX -->
  </head>

  <div id="progress-outer">
    <div id="progress-inner"></div>
  </div>​
  <div id="progress-type">
  </div>

<?php
  session_start();
  include_once 'dbh.inc.php';

  $username = $_POST['username'];
  $password = $_POST['pwd'];

  $sql = "SELECT user_encryptedKey, user_publicKey FROM game_users WHERE user_uid=?;"; //query statement
  $stmt = mysqli_stmt_init($conn);
      if (!mysqli_stmt_prepare($stmt, $sql))
      {
        echo "SQL error";
      }
      else
      {
        mysqli_stmt_bind_param($stmt, "s", $username);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);
        while ($row = mysqli_fetch_assoc($result))
        {
          $encryptedKey = $row['user_encryptedKey'];
          $publicKey = $row['user_publicKey'];

          $encrKey = "'".$encryptedKey."'";
          $pwd = "'".$password."'";
          $publKey = "'".$publicKey."'";
          $usern = "'".$username."'";

          echo "<script type=\"text/javascript\">\n";
          echo "login(${encrKey}, ${pwd}, ${publKey}, ${usern});";
          echo "</script>\n";

          $_SESSION['username'] = $username;
        }
      }
