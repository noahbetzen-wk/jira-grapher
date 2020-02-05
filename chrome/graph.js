(async function() {
    // Pull JIRA url from shared storage
    url = new URL(localStorage.sharedData);
    delete localStorage.sharedData;

    origin = url.origin;
    href = url.href;
    ticket = href.substring(href.lastIndexOf('/') + 1);

    epic = await getTicketJson(origin, ticket);
    ticketType = epic.fields.issuetype.name;
    if(ticketType !== "Epic") {
        alert(`This only works on Jira Epics, you gave it ${ticket}, a ${jticketType}`);
        return;
    }

    ticketsInEpicJson = await getTicketsInEpic(origin, ticket);
    ticketsInEpic = ticketsInEpicJson.issues;

    drawTheGraph(epic, ticketsInEpic);
}());

async function getTicketJson(origin, ticket) {
    path = `${origin}/rest/api/2/issue/${ticket}`;
    response = await window.fetch(path);
    if(response.status != 200) {
        alert(`ERROR: ${JSON.stringify(response)}`);
        return;
    }

    return await response.json();
}

async function getTicketsInEpic(origin, epic) {
    path = `${origin}/rest/api/latest/search/`;
    url = new URL(path);

    params = {jql: `"Epic Link" = ${epic}`};
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    response = await window.fetch(url.href);

    return await response.json();
}

function drawTheGraph(epic, ticketsInEpic) {
    viewPortWidth = window.innerWidth;
    viewPortHeight = window.innerHeight;

    graph = document.getElementById("graph");
    graph.setAttribute("width", viewPortWidth);
    graph.setAttribute("height", viewPortHeight);

    g = graphFromEpic(epic, ticketsInEpic);

    render = dagreD3.render();
    d3.select("svg").call(render, g);

    // Set up zoom support
    svg = d3.select("svg");
    inner = d3.select("svg g");
    zoom = d3.zoom().on("zoom", function() {
        inner.attr("transform", d3.event.transform);
    });
    svg.call(zoom);

    // Code for drag
    // Give IDs to each of the nodes so that they can be accessed
    svg.selectAll("g.node rect")
        .attr("id", function (d) {
        return "node" + d;
    });
    svg.selectAll("g.edgePath path")
        .attr("id", function (e) {
        return e.v + "-" + e.w;
    });
    g.nodes().forEach(function (v) {
        var node = g.node(v);
        node.customId = "node" + v;
    });
    g.edges().forEach(function (e) {
        var edge = g.edge(e.v, e.w);
        edge.customId = e.v + "-" + e.w
    });

    nodeDrag = d3.drag()
        .on("start", dragstart)
        .on("drag", dragmove);

    edgeDrag = d3.drag()
        .on("start", dragstart)
        .on('drag', function (d) {
            translateEdge(g.edge(d.v, d.w), d3.event.dx, d3.event.dy);
            $('#' + g.edge(d.v, d.w).customId).attr('d', calcPoints(d));
        });

    svg.selectAll("g.node").call(nodeDrag);
    svg.selectAll("g.edgePath").call(edgeDrag);
}

function graphFromEpic(epic, ticketsInEpic) {
    g = new dagre.graphlib.Graph();
    g.setGraph({
        rankdir: "TB",
        ranker: "network-simplex"
    });
    g.setDefaultEdgeLabel(function() { return {}; });

    ticketsInEpicIds = ticketsInEpic.map(t => t.key);

    ticketsInEpic.forEach(t => {
        g.setNode(t.key, {label: t.key});
    });

    ticketsInEpic.forEach(t => {
        issuelinks = t.fields.issuelinks;
        if(!issuelinks) {
            return;
        }
        issuelinks.forEach(l => {
            outTicket = l.outwardIssue;
            if(l.outwardIssue) {
                outwardIssue = l.outwardIssue.key;
                if(ticketsInEpicIds.includes(outwardIssue)) {
                    g.setEdge(t.key, l.outwardIssue.key);
                }
            }
            if(l.inwardIssue) {
                inwardIssue = l.inwardIssue.key;
                if(ticketsInEpicIds.includes(inwardIssue)) {
                    g.setEdge(l.inwardIssue.key, t.key);
                }
            }
        });
    });

    g.nodes().forEach(n => {
        node = g.node(n);
        console.log(node);
    });

    console.log(g.graph());

    return g;
}

function dragstart(d) {
    d3.event.sourceEvent.stopPropagation();
}

function dragmove(d) {
    var node = d3.select(this),
        selectedNode = g.node(d);
    var prevX = selectedNode.x,
        prevY = selectedNode.y;

    selectedNode.x += d3.event.dx;
    selectedNode.y += d3.event.dy;
    node.attr('transform', 'translate(' + selectedNode.x + ',' + selectedNode.y + ')');

    var dx = selectedNode.x - prevX,
        dy = selectedNode.y - prevY;

    g.edges().forEach(function (e) {
        if (e.v == d || e.w == d) {
            edge = g.edge(e.v, e.w);
            translateEdge(g.edge(e.v, e.w), dx / 2, dy / 2);
            $('#' + edge.customId).attr('d', calcPoints(e));
            label = $('#label_' + edge.customId);
			var xforms = label.attr('transform');
            if (xforms && xforms != "") {
                console.log(xforms);
                var parts  = /translate\(\s*([^\s,)]+)[ ,]?([^\s,)]+)?/.exec(xforms);
                var X = parseInt(parts[1])+dx, Y = parseInt(parts[2])+dy;
                console.log(X,Y);
                if (isNaN(Y)) {
                    Y = dy;
                }
                label.attr('transform','translate('+X+','+Y+')');
            }            
        }
    })
}

function translateEdge(e, dx, dy) {
    e.points.forEach(function (p) {
        p.x = p.x + dx;
        p.y = p.y + dy;
    });
}

// Taken from dagre-d3 source code (not the exact same)
function calcPoints(e) {
    var edge = g.edge(e.v, e.w),
        tail = g.node(e.v),
        head = g.node(e.w);
    var points = edge.points.slice(1, edge.points.length - 1);
    var afterslice = edge.points.slice(1, edge.points.length - 1)
    points.unshift(intersectRect(tail, points[0]));
    points.push(intersectRect(head, points[points.length - 1]));
    return d3.line()
        .x(function (d) {
            return d.x;
        })
        .y(function (d) {
            return d.y;
        })
        .curve(d3.curveBasis)(points);
}

// Taken from dagre-d3 source code (not the exact same)
function intersectRect(node, point) {
    var x = node.x;
    var y = node.y;
    var dx = point.x - x;
    var dy = point.y - y;
    var w = $("#" + node.customId).attr('width') / 2;
    var h = $("#" + node.customId).attr('height') / 2;
    var sx = 0,
        sy = 0;
    if (Math.abs(dy) * w > Math.abs(dx) * h) {
        // Intersection is top or bottom of rect.
        if (dy < 0) {
            h = -h;
        }
        sx = dy === 0 ? 0 : h * dx / dy;
        sy = h;
    } else {
        // Intersection is left or right of rect.
        if (dx < 0) {
            w = -w;
        }
        sx = w;
        sy = dx === 0 ? 0 : w * dy / dx;
    }
    return {
        x: x + sx,
        y: y + sy
    };
}