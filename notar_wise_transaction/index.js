function isValidHost(urlString) {
  const url = new URL(urlString);
  return url.hostname === "twitter.com" || url.hostname === "x.com";
}

function gotoTwitter() {
  const { redirect } = Host.getFunctions();
  const mem = Memory.fromString("https://x.com");
  redirect(mem.offset);
}

function start() {
  if (!isValidHost(Config.get("tabUrl"))) {
    gotoTwitter();
    Host.outputString(JSON.stringify(false));
    return;
  }

  Host.outputString(JSON.stringify(true));
}

function two() {
  const cookies = JSON.parse(Config.get("cookies"))["api.x.com"];
  const headers = JSON.parse(Config.get("headers"))["api.x.com"];
  if (
    !cookies.auth_token ||
    !cookies.ct0 ||
    !headers["x-csrf-token"] ||
    !headers["authorization"]
  ) {
    Host.outputString(JSON.stringify(false));
    return;
  }

  Host.outputString(
    JSON.stringify({
      url: "https://api.x.com/1.1/account/settings.json",
      method: "GET",
      headers: {
        "x-twitter-client-language": "en",
        "x-csrf-token": headers["x-csrf-token"],
        Host: "api.x.com",
        authorization: headers.authorization,
        Cookie: `lang=en; auth_token=${cookies.auth_token}; ct0=${cookies.ct0}`,
        "Accept-Encoding": "identity",
        Connection: "close",
      },
      secretHeaders: [
        `x-csrf-token: ${headers["x-csrf-token"]}`,
        `cookie: lang=en; auth_token=${cookies.auth_token}; ct0=${cookies.ct0}`,
        `authorization: ${headers.authorization}`,
      ],
    })
  );
}

function parseTwitterResp() {
  const bodyString = Host.inputString();
  const params = JSON.parse(bodyString);

  if (params.screen_name) {
    const revealed = `"screen_name":"${params.screen_name}"`;
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

function three() {
  const params = JSON.parse(Host.inputString());
  const { notarize } = Host.getFunctions();

  if (!params) {
    Host.outputString(JSON.stringify(false));
  } else {
    const mem = Memory.fromString(
      JSON.stringify({
        ...params,
        getSecretResponse: "parseTwitterResp",
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
      description: "Make and Notarize a transaction on Wise.com",
      icon: "",
      steps: [
        {
          title: "Visit wise.com",
          cta: "Go to wise.com",
          action: "start",
        },
        {
          title: "Collect credentials",
          description: "Login to your account if you haven't already",
          cta: "Check cookies",
          action: "two",
        },
        {
          title: "Notarize twitter profile",
          cta: "Notarize",
          action: "three",
          prover: true,
        },
      ],
      hostFunctions: ["redirect", "notarize"],
      cookies: ["wise.com"],
      headers: ["wise.com"],
      requests: [
        {
          url: "https://api.x.com/1.1/account/settings.json", // todo
          method: "GET",
        },
      ],
    })
  );
}

module.exports = { start, config, two, three, parseTwitterResp };
