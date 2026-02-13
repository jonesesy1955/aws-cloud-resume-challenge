const counter = document.querySelector(".counter-number .nav-link");

async function updateCounter() {
  try {
    const response = await fetch("https://xg3udsqqhqkpb6thw5vatlb5a40phpkr.lambda-url.us-east-1.on.aws/");
    const data = await response.json();
    counter.innerHTML = `Views: ${data.views}`;
  } catch (err) {
    counter.innerHTML = "Couldn't read views";
  }
}

updateCounter();
