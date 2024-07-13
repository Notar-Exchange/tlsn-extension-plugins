function isOnWiseAllTransactionsPage(urlString) {
  const url = new URL(urlString);
  return url.hostname === "wise.com" && url.pathname == "/all-transactions";
}

function isOnWiseTransactionDetailsPage(urlString) {
  const url = new URL(urlString);
  console.log(url.pathname, url.pathname.startsWith("/transactions/activities/by-resource/"));
  return url.hostname === "wise.com" && url.pathname.startsWith("/transactions/activities/by-resource/TRANSFER/");
}

function getTransactionIDFromDetailsPageURL(urlString) {
  const url = new URL(urlString);
  const path = url.pathname;
  const parts = path.split("/transactions/activities/by-resource/TRANSFER/");
  return parseInt(parts[parts.length - 1]);
}

// Redirects to the login page with a redirect URL set to the all transactions page
// Doing it this way, we don't need to check any cookies or headers
function redirectToWiseAllTransactionsPage() {
  const { redirect } = Host.getFunctions();
  const mem = Memory.fromString("https://wise.com/login?redirectUrl=%2Fall-transactions");
  redirect(mem.offset);
}

// has to be called start
function start() {
  if (!isOnWiseAllTransactionsPage(Config.get("tabUrl"))) {
    redirectToWiseAllTransactionsPage();
    Host.outputString(JSON.stringify(false));
    return;
  }

  Host.outputString(JSON.stringify(true));
}

function step_two() {
  if (!isOnWiseTransactionDetailsPage(Config.get("tabUrl"))) {
    Host.outputString(JSON.stringify(false));
    return;
  }

  const url = "https://wise.com/api/v3/payment/details?simplifiedResult=0&paymentId=" + getTransactionIDFromDetailsPageURL(Config.get("tabUrl"));

  const cookies = JSON.parse(Config.get('cookies'))['wise.com'];
  const headers = JSON.parse(Config.get('headers'))['wise.com'];

  const cookieString = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');

  console.log(JSON.stringify({
      url: url,
      method: "GET",
      headers: headers,
      secretHeaders: [
        `cookie: ${cookieString}`,
      ],
    })
  );

  Host.outputString(
    JSON.stringify({
      url: url,
      method: "GET",
      headers: headers,
      secretHeaders: [
        `cookie: ${cookieString}`,
      ],
    })
  );
  return;
}

function parseWiseTransactionDetailsResponse() {
  console.log("Parse response");
  const bodyString = Host.inputString();
  const params = JSON.parse(bodyString);

  if (params.internalStatus == "TRANSFERRED") {
    // const revealed = `"screen_name":"${params.screen_name}"`;
    const revealed = bodyString; // reveal entire body string for now

    const selectionStart = bodyString.indexOf(revealed);
    const selectionEnd = selectionStart + revealed.length;

    const secretResps = [
      bodyString.substring(0, selectionStart),
      bodyString.substring(selectionEnd, bodyString.length),
    ];

    Host.outputString(JSON.stringify(secretResps));
  } else {
    Host.outputString(JSON.stringify(false));
  }
}

function step_three() {
  console.log("Start notarize");
  const params = JSON.parse(Host.inputString());
  const { notarize } = Host.getFunctions();

  if (!params) {
    Host.outputString(JSON.stringify(false));
  } else {
    const mem = Memory.fromString(
      JSON.stringify({
        ...params,
        getSecretResponse: "parseWiseTransactionDetailsResponse",
      })
    );
    const idOffset = notarize(mem.offset);
    const id = Memory.find(idOffset).readString();
    Host.outputString(JSON.stringify(id));
  }
}

function config() {
  Host.outputString(
    JSON.stringify({
      title: "Wise Transaction",
      description: "Notarize a transaction on Wise.com",
      icon: "",
      steps: [
        {
          title: "Visit the All Transactions page",
          description: "Go to wise.com and log into your Wise account if you haven't already, then visit the all transactions page (/all-transactions) and click the button below to confirm",
          cta: "Confirm",
          action: "start",
        },
        {
          title: "Open the transaction you want to notarize",
          description: "In the transactions list, click on the transaction to view its details, then click the button below to confirm",
          cta: "Confirm",
          action: "step_two",
        },
        {
          title: "Notarize transaction",
          description: "This can take a few minutes to run",
          cta: "Notarize",
          action: "step_three",
          prover: true,
        },
      ],
      hostFunctions: ["redirect", "notarize"],
      cookies: ["wise.com"],
      headers: ["wise.com"],
      requests: [
        {
          url: "https://wise.com/api/v3/payment/details", // ?paymentId=BLABLA&simplifiedResult=0
          method: "GET",
        },
      ],
    })
  );
}

module.exports = { start, config, step_two, step_three, parseWiseTransactionDetailsResponse };
