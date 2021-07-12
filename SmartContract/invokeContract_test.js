Neon = require('@cityofzion/neon-js')
StackItemJson = require('@cityofzion/neon-core')

fromAccount = new Neon.wallet.Account(
  "e95ba9dfc14acbd12bf847d086c32cb171f358651ec39dce3a5a347e28ee6c66"
)

toAccount = new Neon.wallet.Account(
  "6574488047bbcf4d5206387d0a6328d3cc5c9455303823f5614f2c0035c0e756"
)

const scriptHash = "0xd9da3d4578cf6975d0b5e831472e0f06ecb46a5a"//Testnet: "0x337cf25dc2bd20e6628c5343dce61ed428114cc6"//"0xa9842872b0125df97738e7973e03902f28fd95da"
const rpcAddress = "http://localhost:50012" //Testnet: "https://testnet1.neo.coz.io:443"
const networkMagic = 1315354988//Testnet: 844378958

/*------------------------------------*/
async function callCheckOwner()
{
  let res = await checkOwner(rpcAddress, networkMagic, scriptHash)
  console.log("symbol: ", res) // --> COZA
}

async function checkOwner(node, networkMagic, contractHash){
  const method = "contractOwner"

  const res = await testInvoke(node, networkMagic, contractHash, method, [] )
  if (res === undefined || res.length === 0) {
    throw new Error("unrecognized response")
  }

  console.log(res[0].value)

  return Neon.u.HexString.fromBase64(res[0].value).toString()
}
/*------------------------------------*/

/*------------------------------------*/
async function callSymbol()
{
  let res = await symbol(rpcAddress, networkMagic, scriptHash)
  console.log("symbol: ", res) // --> COZA
}

async function symbol(node, networkMagic, contractHash){
  const method = "symbol"

  const res = await testInvoke(node, networkMagic, contractHash, method, [] )
  if (res === undefined || res.length === 0) {
    throw new Error("unrecognized response")
  }

  return Neon.u.HexString.fromBase64(res[0].value).toAscii()
}
/*------------------------------------*/

/*------------------------------------*/
async function callDecimals()
{
  let res = await decimals(rpcAddress, networkMagic, scriptHash)
  console.log("decimals: ", res) // --> COZA
}

async function decimals(node, networkMagic, contractHash){
  const method = "decimals"

  const res = await testInvoke(node, networkMagic, contractHash, method, [] )
  if (res === undefined || res.length === 0) {
    throw new Error("unrecognized response")
  }

  return res[0].value
}
/*------------------------------------*/

/*------------------------------------*/
async function callTokensOf()
{
  let res = await tokensOf(rpcAddress, networkMagic, scriptHash)
  console.log("tokensOf: ", res)
}

async function tokensOf(node, networkMagic, contractHash){
  const method = "tokensOf"

  const address = Neon.sc.ContractParam.hash160(fromAccount.address)

  const res = await testInvoke(node, networkMagic, contractHash, method, [address])

  if (res === undefined || res.length === 0) {
    throw new Error("unrecognized response")
  }

  let tokenids = new Array()

  for (key in res[0].iterator)
  {
    let i = 0
    for (next in res[0].iterator[key].value)
    {
      if (i%2 !== 0)
      {
        tokenids.push(res[0].iterator[key].value[next].value)
      }
      i++
    }
  }

  tokenidsRenew = new Array()

  for (key in tokenids)
  {
    if (tokenids[key].length === 2)
    {
      tokenidsRenew.push(parseInt(Neon.u.base642hex(tokenids[key]), 16))
    }
    else if (tokenids[key].length === 4)
    {
      tokenidsRenew.push(parseInt(Neon.u.reverseHex(Neon.u.base642hex(tokenids[key])), 16))
    }
  }

  return tokenidsRenew
}
/*------------------------------------*/

/*------------------------------------*/
async function callTotalSupply()
{
  let res = await totalSupply(rpcAddress, networkMagic, scriptHash)
  console.log("totalSupply: ", res)
}

async function totalSupply(node, networkMagic, contractHash){
  const method = "totalSupply"

  const res = await testInvoke(node, networkMagic, contractHash, method, [])

  if (res === undefined || res.length === 0) {
    throw new Error("unrecognized response")
  }

  return parseInt(res[0].value)
}
/*------------------------------------*/

/*------------------------------------*/
async function callBalanceOf()
{
  let res = await balanceOf(rpcAddress, networkMagic, scriptHash)
  console.log("balanceOf: ", res)
}

async function balanceOf(node, networkMagic, contractHash){
  const method = "balanceOf"

  const address = Neon.sc.ContractParam.hash160(fromAccount.address)

  const res = await testInvoke(node, networkMagic, contractHash, method, [address])

  if (res === undefined || res.length === 0) {
    throw new Error("unrecognized response")
  }

  return parseInt(res[0].value)
}
/*------------------------------------*/

/*------------------------------------*/
async function callOwnerOf()
{
  let res = await ownerOf(rpcAddress, networkMagic, scriptHash)
  console.log("ownerOf: ", res)
}

async function ownerOf(node, networkMagic, contractHash){
  const method = "ownerOf"

  token_id = {
    type: "Integer",
    value: "01"
  }

  token_id_param = new Neon.sc.ContractParam(token_id)

  const res = await testInvoke(node, networkMagic, contractHash, method, [token_id_param])

  if (res === undefined || res.length === 0) {
    throw new Error("unrecognized response")
  }

  return Neon.u.base642hex(res[0].value)
}
/*------------------------------------*/

/*------------------------------------*/
async function callProperties()
{
  let res = await properties(rpcAddress, networkMagic, scriptHash)
  console.log("properties: ", res)
}

async function properties(node, networkMagic, contractHash){
  const method = "properties"

  token_id = {
    type: "Integer",
    value: "1"
  }

  token_id_param = new Neon.sc.ContractParam(token_id)

  const res = await testInvoke(node, networkMagic, contractHash, method, [token_id_param])

  if (res === undefined || res.length === 0) {
    throw new Error("unrecognized response")
  }

  return hex2a(res[0].value.replace("Q==", ""))
}
/*------------------------------------*/

/*------------------------------------*/
async function callTokens()
{
  let res = await tokens(rpcAddress, networkMagic, scriptHash)
  console.log("tokens: ", res)
}

async function tokens(node, networkMagic, contractHash){
  const method = "tokens"

  const res = await testInvoke(node, networkMagic, contractHash, method, [])

  if (res === undefined || res.length === 0) {
    throw new Error("unrecognized response")
  }

  let tokenids = new Object()

  for (key in res[0].iterator)
  {
    let i = 0
    let t_key = undefined
    let t_value = undefined

    for (next in res[0].iterator[key].value)
    {
      if (i%2 !== 1)
      {
        t_key = Neon.u.base642hex(res[0].iterator[key].value[next].value)
      }
      else
      {
        t_value = Neon.u.base642hex(res[0].iterator[key].value[next].value)
      }
      i++
    }

    tokenids[t_key] = t_value
  }
  return tokenids
}
/*------------------------------------*/

/*------------------------------------*/
async function mintToken()
{
  const meta = 1
  let res = await mint(rpcAddress, networkMagic, scriptHash, fromAccount.address, meta, fromAccount)
  console.log("mint: ", res)
}

async function mint(node, networkMagic, contractHash, address, meta, account)
{
  const method = "mint"
  properties = "Some test properties, just a string" //define token properties

  param_props = Neon.sc.ContractParam.byteArray(ascii_to_hexa(properties));

  const params = [
    Neon.sc.ContractParam.hash160(address),
    param_props,
    Neon.sc.ContractParam.hash160(address),
  ]

  return await publishInvoke(node, networkMagic, contractHash, method, params, account )
}
/*------------------------------------*/

/*------------------------------------*/
async function transferToken()
{
  //const accountTransfer = new Neon.wallet.Account(await Neon.wallet.decrypt("6PYLExgWyQAjDdMpk5BXp4rJ1yyW5csRDLrFA39fMnE7DmxX7MZ3DC3Bdu", "12345"))

  let res = await transfer(rpcAddress, networkMagic, scriptHash, toAccount.address, fromAccount)
  console.log("transfer: ", res)
}

async function transfer(node, networkMagic, contractHash, address, account)
{
  const method = "transfer"

  /*hardcode tokenid to transfer*/
  token_id = {
    type: "Integer",
    value: "1"
  }

  token_id_param = new Neon.sc.ContractParam(token_id)

  const params = [
    Neon.sc.ContractParam.hash160(address),
    token_id_param,
    "",
  ]

  return await publishInvoke(node, networkMagic, contractHash, method, params, account )
}


/*------------------------------------*/


async function testInvoke(rpcAddress, networkMagic, scriptHash, operation, args){
  const contract = new Neon.experimental.SmartContract(
    Neon.u.HexString.fromHex(scriptHash),
    {
      networkMagic,
      rpcAddress,
    }
  );
  let res = await contract.testInvoke(operation, args)

  console.log(res)

  return res.stack
}

async function publishInvoke(rpcAddress, networkMagic, scriptHash, operation, args, account){
  const contract = new Neon.experimental.SmartContract(
    Neon.u.HexString.fromHex(scriptHash),
    {
      networkMagic,
      rpcAddress,
      account,
    }
  );

  let result
  try {
    result = await contract.invoke(operation, args)
  } catch (e) {
    console.log(e)
  }

  return result
}

/*----------------CALL FUNCTIONS FOR INVOKE SMART CONTRACT-------------------*/

//callCheckOwner()
//callSymbol()
//callDecimals()
//callTotalSupply()
//callTokensOf()
//callTokens()
//callBalanceOf()
//callOwnerOf()
//callProperties()

//mintToken()
//transferToken()


/*----------------HELPERS-------------------*/

function ascii_to_hexa(str) {
  var arr1 = [];
  for (var n = 0, l = str.length; n < l; n ++)
  {
  	var hex = Number(str.charCodeAt(n)).toString(16);
  	arr1.push(hex);
  }
  return arr1.join('');
}

function hex2a(hexx) {
  var hex = hexx.toString();//force conversion
  var str = '';
  for (var i = 0; (i < hex.length && hex.substr(i, 2) !== '00'); i += 2)
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  return str;
}
