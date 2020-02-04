(async function() {
    // Pull JIRA url from shared storage
    url = new URL(localStorage.sharedData);
    origin = url.origin;
    href = url.href;
    ticket = href.substring(href.lastIndexOf('/') + 1);

    path = `${origin}/rest/api/2/issue/${ticket}`;
    response = await window.fetch(path);
    if(response.status != 200) {
        alert(`ERROR: ${response}`);
        return;
    }

    json = await response.json();
    console.log(json);
}());