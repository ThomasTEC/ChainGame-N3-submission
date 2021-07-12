<?php
session_start();
$name = $_SESSION['username']
?>

<!DOCTYPE html>

<html>

  <head>
    <meta charset="utf-8">
    <title>MyGame</title>

    <link rel="stylesheet" href="test_css/styles.css" type="text/css" media="screen"> <!-- Verlinkung CSS -->
    <script src="https://unpkg.com/@cityofzion/neon-js@next"></script>
    <script src="js/registrate.js" type="text/javascript"></script> <!-- Verlinkung JavaScript -->
  </head>

  <body>
    <div class="login_background">
      <div class="login_menu_wrapper">

          <div id="login_menu_login_wrapper" class="loginlayer">
            <form action="include/login.inc.php" method="POST">
              <input type="text" id="login_username" name="username" placeholder="username">
              <input type="password" id="login_password" name="pwd" placeholder="password">
              <button type="submit" class="menu_button" id="login_loginbtn" name="submit"></button>
            </form>

            <div id="login_message"></div>

            <button type="button" class="menu_button" id="login_signup" name="submit" onclick="registrate.init('signup')"></button>
          </div>

          <div id="login_menu_signup_wrapper" class="loginlayer">
            <form action="include/create_acc.inc.php" method="POST">
              <input type="text" id="signup_username" name="uid" placeholder="username">
              <input type="text" id="signup_encrypted_key" name="encrypted_key" placeholder="encrypted key">
              <input type="text" id="signup_public_key" name="public_key" placeholder="public key">
              <button type="submit" class="menu_button" id="signup_signupbtn" name="submit"></button>
            </form>

            <div id="signup_message">
            </div>

            <input id="signup_password" type="pwd" name="pwd_key" placeholder="password">

            <button class="menu_button" id="signup_createkeysbtn" name="create_key" onclick="registrate.createKeys()"></button>
          </div>

      </div>
    </div>

  </body>

</html>
