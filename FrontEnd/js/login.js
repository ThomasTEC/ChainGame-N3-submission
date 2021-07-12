console.log(Neon)
console.log(listCookies());

const def = Neon.default;
const wallet = Neon.wallet;

var loading = {
  files: undefined,
  toload: 0,
  loaded_elem: 0,
  files_finished: false,
  database_finished: false,
  state: undefined,

  init: function() {
    $.ajax({url: "filesystem.inc.php",
      dataType:"json", async: false, success: function(file_array)
      {
        loading.files=file_array;
      }
    });
    loading.toload = loading.files['files'].length
    document.getElementById("progress-type").innerHTML = "loading images "+loading.loaded_elem+"/"+loading.toload;
    loading.loadelements()
  },

  loadelements: function()
  {
    for(var i = 0; i<loading.toload; i++)
    {
      console.log(i)
      var img = new Image();
      img.src = loading.files['files'][i];

      img.onload = function()
      {
        loading.loaded_elem += 1;
        var elem = document.getElementById("progress-inner");
        document.getElementById("progress-type").innerHTML = "loading images "+loading.loaded_elem+"/"+loading.toload;
        elem.style.width = Math.round((loading.loaded_elem/loading.toload)*100) + '%';
      }
    }
    loading.files_finished = true
    loading.loaded();
  },

  loaded: function()
  {
    loading.database_finished = loading.checkBlockchaindata();
    console.log(loading.database_finished)
    if (loading.database_finished === true && loading.files_finished === true)
    {
      window.location = '../home.php?login=success&char='+getCookie('username');
    }
  },

  checkBlockchaindata: function()
  {
    document.getElementById("progress-type").innerHTML = "getting Blockchaindata";

    $.ajax({url: "../database_requests.php?task=set_logindata&username="+getCookie('username'),
    dataType:"json", async: false, success: function(task_php)
    {
      loading.state=task_php;
    }});
    console.log(loading.state)

    document.getElementById("progress-type").innerHTML = "processing Blockchaindata";

    while (loading.state == 0)
    {
      $.ajax({url: "../database_requests.php?task=check_login&username="+getCookie('username'),
      dataType:"json", async: false, success: function(task_php)
      {
        loading.state=task_php;
      }});
    }

    document.getElementById("progress-type").innerHTML = "Received Blockchain Data";

    $.ajax({url: "../database_requests.php?task=delete_login&username="+getCookie('username'),
    dataType:"json", async: true, success: function(task_php)
    {
      loading.state=task_php;
    }});

    if (loading.state == true)
    {
      return true
    }
    return false
  }
}

async function login(encryptedKey, pwd, publicKey, name)
{
  console.log("HIER")
  document.getElementById("progress-type").innerHTML = "login"

  wallet.decrypt(encryptedKey, pwd)
    .then(privateKey =>
    {
      const myAccount = new wallet.Account(privateKey);

      console.log(myAccount)

      if(myAccount._address === publicKey)
      {
        console.log("keys fit")
        setCookie("encryptedKey", encryptedKey, 7)
        setCookie("username", name, 7)
        setCookie("password", pwd, 7)
        document.getElementById("progress-type").innerHTML = "login successful"
        loading.init()
      }
      else
      {
        window.location = '../index.php?login=failed&error=wrong_password';
      }
    })
    .catch(err =>
    {
      console.log(err)
      window.location = '../index.php?login=failed&error=wrong_password';
    })
}

function setCookie(name,value,days)
{
  var expires = "";
  if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days*24*60*60*1000));
      expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function getCookie(cname)
{
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function listCookies() {
    var theCookies = document.cookie.split(';');
    var aString = '';
    for (var i = 1 ; i <= theCookies.length; i++) {
        aString += i + ' ' + theCookies[i-1] + "\n";
    }
    return aString;
}
