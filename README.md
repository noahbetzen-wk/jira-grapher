# Jira Relationship Grapher

This extension uses the Chrome/Firefox extension APIs to pull data from the Jira API while you're logged into a Jira instance. It doesn't pass any auth tokens or cookies around. It just makes some API calls in the current page and uses the data to create a new tab with the requested graph.

The tool this is based on uses Graphviz on a server to generate the graph. [Graphviz has been ported to JavaScript for client-side graphing, but the repo is archived and the author recommends another library.](https://github.com/mdaines/viz.js#see-also)

The alternative listed is called [Dagre](https://github.com/dagrejs/dagre), and this tool uses it and [Dagre D3](https://github.com/dagrejs/dagre-d3) (based on [D3.js](https://d3js.org/)) for rendering.

# Browser APIs:

- [Chrome](https://developer.chrome.com/extensions/getstarted)
- [FireFox](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension)