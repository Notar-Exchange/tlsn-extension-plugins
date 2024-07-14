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

  console.log("Alive!");

  const url = "https://wise.com/api/v3/payment/details?simplifiedResult=1&paymentId=" + getTransactionIDFromDetailsPageURL(Config.get("tabUrl"));

  console.log("Using", url);

  const cookies = JSON.parse(Config.get('cookies'))['wise.com'];
  const headers = JSON.parse(Config.get('headers'))['wise.com'];

  console.log("Still alive!");

  const cookieString = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');

  console.log("Woohoo");
  headers['Cookie'] = cookieString;

  console.log(JSON.stringify({
      url: url,
      method: "GET",
      headers: headers
    })
  );

  Host.outputString(
    JSON.stringify({
      url: url,
      method: "GET",
      headers: {
        Cookie: `oauthToken=${cookies.oauthToken};`,
      }
    })
  );

  console.log("OMG!");
  return;
}

function parseWiseTransactionDetailsResponse() {
  console.log("Parse response");
  const bodyString = Host.inputString();
  const params = JSON.parse(bodyString);
  console.log("Params: ", JSON.stringify(params));

  if (params.internalStatus == "TRANSFERRED") {
    // const revealed = `"screen_name":"${params.screen_name}"`;
    // const revealed = bodyString.substring(1, 10); // reveal 1st to 10th character for now

    const selectionStart = bodyString.indexOf(revealed);
    const selectionEnd = selectionStart + revealed.length;

    const secretResps = [
      bodyString.substring(0, selectionStart),
      bodyString.substring(selectionEnd, bodyString.length),
    ];

    console.log("Revealing", selectionStart, "to", selectionEnd);
    console.log(JSON.stringify(secretResps));
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
        // getSecretResponse: "parseWiseTransactionDetailsResponse",
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
      description: "Notarize a transaction and submit it as proof to claim crypto in escrow",
      icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAFABAMAAAA/vriZAAAAIVBMVEWf6HAWMwAUMQAbOgSY32pglT1wqklIdSmFxls4YBwoSw89vLKWAAAFC0lEQVR42u2dv09aURTHGZ5Ix/eINbIBMQY3MaDt9AapwQmDXTrRmHRgAmvSlaRpG900tLGjpjH+mU20pXp/wHnh3nOu9PuZTTh53Pv9nl8PczkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIBF5ctbd4x8BNjedsbrno8A8/XYEUnNyxOMLlwFGK/6OYT9sqsneOsnwH1XAVbGfgIs3DgKsNjxJDRdR49wc+QpwDNHAa6lngLMb7kJsOHLS6ITN5f4zpvbORKaU28B7juJr9rzFqAboamNvAWYO3QR4EbqL0AXQuPL6JwJTTL2GKCLjCbpeAzQhdAURz4DdJDRrKU+A3QgNCt+S6e5MxqPRnfP+dwBnvoNcGluoen5DXBuoamN/AaYOw6zonOW0SRN3wGqQjOjibDFaXQPDJ9+4o8PU3mn3vqB9wCfZjTJ1YwjW+Y0OlNGM8MYTliNziQ004vcwiWv0RmEZrozqAmkb6MzZTTNLNmPb6MzCc3UU6Vad7HHEGDUpbeCDllalzOE5i6Dc2+wtNOVjGZnymlQjaTJEqDyXEr2c7XEb3TZhKat3pEBT4BkoREwOpPQlFKq0dVSngAV9bAKjYjRmfTXJjTa7GeXK0BFaGz9KhGjexCap9/dZo9Yo/a4AlSFZkxrJ26O2AJUvryXRKNL2QJUhcb4aArX3BXdo4ejKFyH1IX4xRdg/oaQKEsZnel+Gk9XXyJbNcqMRWiGZfaKztb/MGbKckaXi4aU0YJqdCwV3Z/rWad8w6rRVdiMTu/1N0hG1xFS6TiuHpn+7L3yVyU2ozsjTd+0g8pmdAXVYqtXFKOLm1IaE6+NKEbHdokjdVRi+WQxo6NpjFBbxqgxTVq2ymV02tkvHoVV0WlD99U0qIpOUzfbkolW0Y2FNMbW8dPuCJPRaePYO1Ldx1bRvbmhaYyY0akaYy3U1NZl0uDRmAuaxhgqOh6jO0uUj91Jia1LhhmdUWPGxLIv2WYxuladlMfcV3QiRteNqQdLq0t3OALMXxM1RsrotCqosacyOQwiMzr1a4tf/VT4ntpSCg6j+zZ7p2fFVtFxGF30kb72JGJ0rdk7R5OTprUuOYyOsDo42e+VGLTnZy/m/etxvRCo6ChrbxuCFV2BslTWtFV0Jf93pJ1lvzfir+gIGvNov1fA6FqUV8Im0+Al/orumLIZWrMZnd/VaWPLMjSjO8+238tudHoeE5jREddCe1IVXTQkLU9PThp7RUfcnZ60udiNrp9xv7fLbHTEFwzsRrfO3bK0MLAlZp7nD9Tl+InRtZiNjrp6PukdtHkruoj6BsmKUOuyVa/QkKroWp+I/O0URsxGt0cltcg646CdxrKqj4PAAhSb0ZGbiGWpQTtRli5pozIxNKPbDewbFqjoMlb47BVd1gKV3McWQmb+kOESS7QuM13i52Z08WlgAQquTi+I0Snbwcl6YJe4ELzRqcngFYxuwY2uFtgdUY0uhtHN2SYphpatPr+KLrQ7chJ4RVdgbl3OX9GFbnSV0Izuc+BGFx2GbnQXMDrHFd0gdKMLLlt9ZhUdjG7hKjrt/YejwI0uuGw1dKPbuxB7GXZRjS60iu4ARgejwyXOZHTF4OYPfL867cbogpvRhW502ot+t4EFuBwHPmg/UBalqqEZXV/9HymBGV3uq/r7pjkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAID/kN+RAqoX314acgAAAABJRU5ErkJggg==",
      steps: [
        {
          title: "Visit Wise.com -> All Transactions",
          description: "Go to wise.com and log into your Wise account, then visit the all transactions page",
          cta: "Confirm",
          action: "start",
        },
        {
          title: "Open the transaction you want to notarize and send as proof",
          description: "In the transactions list, click on the transaction to view its details",
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
          url: `https://wise.com/api/v3/payment/details?simplifiedResult=1&paymentId=*`,
          method: "GET",
        },
      ],
    })
  );
}

module.exports = { start, config, step_two, step_three, parseWiseTransactionDetailsResponse };
