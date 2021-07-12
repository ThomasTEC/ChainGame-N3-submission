console.log(Neon)

const def = Neon.default;
const wallet = Neon.wallet;

var registrate = {
  //init Will be called after HTML page finished loading
  init: function(type)
  {
    if (type == "login")
    {
      registrate.hideScreens();
      registrate.showScreen("login_menu_login_wrapper");
    }
    else if (type == "signup")
    {
      registrate.hideScreens();
      registrate.showScreen("login_menu_signup_wrapper");
    }
  },

  //create hideScreens method - manipulating CSS
  hideScreens: function()
  {
    var screens = document.getElementsByClassName("loginlayer"); //ElemByClass -> divs in HTML
    for (let i = screens.length -1; i>=0; i--)
    {
      //lädt aktuellen screen von i
      var screen = screens[i];
      //nicht anzeigen
      screen.style.display = "none";
    }
  },

  //Einzelnen Screen ausblenden - manipulating CSS
  hideScreen: function(id)
  {
    var screen = document.getElementById(id);
    screen.style.display = "none";
  },

  //Einzelnen Screen anzeigen - manipulating CSS
  showScreen: function(id)
  {
    var screen = document.getElementById(id);
    screen.style.display = "block";
  },


  createKeys: function()
  {
    password = document.getElementById("signup_password").value
    let privateKey = def.create.privateKey()
    let WIF = wallet.getWIFFromPrivateKey(privateKey)
    const myAccount = new wallet.Account(WIF); //Account für Wallet 1
    console.log(myAccount)
    myAccount.encrypt(password)
      .then(keys =>
        {
          var encrKey = document.getElementById("signup_encrypted_key");
          var publKey = document.getElementById("signup_public_key");

          encrKey.value = keys._encrypted;
          publKey.value = keys._address;
        });
  }
};

window.addEventListener("load", function()
{
  registrate.init();
});
