function Radial() {
  // based on https://bl.ocks.org/mbostock/7607999
  var filterCount =0;
  var type ="";
  var diameter = 600;
  var radius = diameter / 2;
  var innerRadius = radius - 10;
  var nodeSize = 5;
  var defaultMsg = "Hover over a node for details.<br />Click on a node to keep it highlighted.";
  var msg = defaultMsg;

  var color = d3.scaleOrdinal().range(d3.schemeCategory10);
var childrenList;
  var update;
  var originalData;

  var filtering = {
    startDate: null,
    endDate: null,
    unconnectedNodes: true,
    codeStatus: "",
    codePath: "",
    issueDescription: "",
    issueSummary: "",
    issueType: "",
    issueStatus: "",
    issueID: "",
    code: true,
    issue: true,
    onlyHighlighted: false,
	multiplefilt:false //multiple filters
	
  }

  function match(a, b) {
    return a.toLowerCase().search(b.toLowerCase()) !== -1;
  }
  function findChildren(data){
	   childrenList =[];
	  data.nodes.forEach(d=>{
		  if (d.type != "code"){
		if (match(d.id, filtering.issueID)){
			childKeyName = Object.keys(d["children"])
            if (childKeyName.length > 0){
                for (var children of d["children"][childKeyName[0]]){
                    childrenList.push(children);
				}
			}
		}
	  }
	  });
	  
  }
		
  function filterNodes(d) {
	  
	// if ((filtering.onlyHighlighted && !d.frozen)) {
   if (!filtering[d.category] || (filtering.onlyHighlighted && !d.frozen)) {
      return false;
    }


	// Trying to figure out a way to get multiple filters to work
/* 	var res = filtering.issueType.split(",");
	for (var k in res){
		if(res[k] != " "){
			filtering.issueType = res[k];
		} */
   
   if (d.type != "code") {
      if (!match(d.issuetype, filtering.issueType) ||
        !match(d.description, filtering.issueDescription) ||
        !match(d.summary, filtering.issueSummary) ||
        !match(d.status, filtering.issueStatus)) {
        return false;
		}else if (!match(d.id, filtering.issueID)){
			for( var name in childrenList){
				if (match (d.id, childrenList[name])){
					return true;
				}
			}
			return false;
		
      } else if (d.type === "code") {
        if (!match(d.code_status, filtering.codeStatus) ||
          !match(d.id, filtering.codePath)) {
          return false;
        }
        if (filtering.startDate && filtering.endDate) {
          return d.timestamp >= filtering.startDate &&
            d.timestamp <= filtering.endDate;
        }
      }

    }
	
    return true;
//}
  }

  var radial = function(selection) {
    selection.each(function(data, i) {

      var svg = selection.append("svg")
        .attr("width", diameter)
        .attr("height", diameter);

      var graph = svg.append("g")
        .attr("transform", "translate("+ radius +","+ radius +")");

      var info = d3.select("#info");
      info.text(defaultMsg);

      var cluster = d3.cluster()
        .size([360, innerRadius]);

      var line = d3.radialLine()
        .curve(d3.curveBundle.beta(0.85))
        .radius(d => d.y)
        .angle(d => { return d.x / 180 * Math.PI});

      var linkGroup = graph.append("g").attr("class", "link_group");
      var nodeGroup = graph.append("g").attr("class", "node_group");

      var original_grouped = d3.nest()
        .key(d => d.type)
        .entries(data.nodes);
      //console.log(original_grouped)
      var types = original_grouped.map(d => d.key);
      var legend = graph.append("g")
        .attr("class", "legend_group")
        .attr("transform", d => "translate("+(-radius + 10)+","+ (-radius + 10)+")")
        .selectAll(".legend")
        .data(types)
        .enter().append("g")
        .attr("transform", (d, i) => "translate("+(0)+","+(i*15)+")");

      legend.append("text")
        .text(d => d)
        .attr("font-family", "sans-serif")
        .attr("dy", "0.35em")
        .attr("dx", "0.75em")
        .attr("font-size", "14");
      legend.append("circle")
        .attr("fill", d => color(d))
        .attr("r", nodeSize);


      update = function() {
        findChildren(data);
		var filteredNodes = data.nodes.filter(filterNodes);
		
        var idToNode = {};
        for (var n of filteredNodes) {
          n.connected = false;
          idToNode[n.id] = n;
        }
		
        var filteredLinks = [];
        for (var l of data.links) {
          var asource = idToNode[l.source];
          var atarget = idToNode[l.target];

          if (asource && atarget) {
            asource.connected = true;
            atarget.connected = true;
            filteredLinks.push(l);
          }
        }

        if (!filtering.unconnectedNodes) {
          filteredNodes = filteredNodes.filter(d => d.connected);
        }

        var root = {id: "root", children: []};
        var grouped = d3.nest()
          .key(d => d.type)
          .entries(filteredNodes);

        for (var g of grouped) {
          root.children.push({id: g.key, children: g.values})
        }

        root = d3.hierarchy(root);
        cluster(root);
        var idToNode = {};
        for (var c of root.leaves()) {
          idToNode[c.data.id] = c;
        }

        var updatedLinks = [];
        for (var l of filteredLinks) {
          var asource = idToNode[l.source];
          var atarget = idToNode[l.target];
          var a = [asource, atarget];
          a.source = asource;
          a.target = atarget;
          a.source_type = l.source_type;
          a.target_type = l.target_type;
          updatedLinks.push(a);
        }


        var links = linkGroup.selectAll(".radial_link")
          .data(updatedLinks, d => d[0].data.id + "_" + d[1].data.id);
        links.exit().remove();

        links.enter().append("path")
          .attr("class", "radial_link")
          .merge(links)
          .transition()
          .duration(200)
          .attr("d", line);

        var nodes = nodeGroup.selectAll(".radial_node")
          .data(root.leaves(), d => d.data.id);
        nodes.exit().remove(); 

        nodes.enter().append("circle")
          .attr("class", "radial_node")
          .attr("fill", d => color(d.data.type))
          .attr("r", nodeSize)
          .on("mouseover", mouseover)
          .on("mouseout", mouseout)
          .on("click", click)
          .merge(nodes)
          .transition()
          .duration(200)
          .attr("transform", d => "rotate(" + (d.x - 90)  + ") translate(" + d.y + ")");

        if (graph.selectAll(".clicked").size() === 0) {
          graph.selectAll(".frozen").classed("frozen", false);
          msg = defaultMsg;
          info.html(msg);
        }
      }
      update();


      function click(d) {
        graph.selectAll(".radial_node.frozen")
          .classed("frozen", false)
          .each(d => d.data.frozen = false);

        graph.selectAll(".radial_link.frozen").classed("frozen", false);

        if (d3.select(this).classed("clicked")) {
          msg = defaultMsg;
          graph.selectAll(".clicked").classed("clicked", false);

          if (filtering.onlyHighlighted) {
            update();
          }

          return;
        }
        graph.selectAll(".clicked").classed("clicked", false);

        msg = info.html();

        let hnodes = new Set();

        graph.selectAll(".radial_link")
          .filter(function(n) {
            if (n.source === d) {
              hnodes.add(n.target);
              n.target.data.frozen = true;
              return true;
            }
            if (n.target === d) {
              hnodes.add(n.source);
              n.source.data.frozen = true;
              return true;
            }
          })
          .classed("frozen", true);

        graph.selectAll(".radial_node")
          .filter(function(n) {
            return hnodes.has(n);
          })
          .classed("frozen", true);

        d.data.frozen = true; 

        d3.select(this).classed("clicked", true);
        d3.select(this).classed("frozen", true);

        if (filtering.onlyHighlighted) {
          update();
        }

      }

      function mouseover(d) {
        // highlight the edges and nodes that are connected with this node
        d3.select(this).classed("highlight", true);

        let hnodes = new Set();

        graph.selectAll(".radial_link")
          .filter(function(n) {
            if (n.source === d) {
              hnodes.add(n.target);
              return true;
            }
            if (n.target === d) {
              hnodes.add(n.source);
              return true;
            }
            return false;
          })
          .classed("highlight", true);

        graph.selectAll(".radial_node")
          .filter(function(n) {
            return hnodes.has(n);
          })
          .classed("highlight", true);


        // show information about this node
        let dat = d.data;
        if (dat.type === "code") {
          info.html("<strong>Status</strong>: " + dat.code_status +
            "<br><br><strong>File name</strong>: " + dat.id +
            "<br><br><strong>Time</strong>: " + dat.timestamp);
        } else{
          info.html("<strong>ID</strong>: " + dat.id +
            "<br><br><strong>Status</strong>: " + dat.status +
            "<br><br><strong>Issue Type</strong>: " + dat.issuetype +
            "<br><br><strong>Summary</strong>: " + dat.summary +
            "<br><br><strong>Description</strong>: " + dat.description);
        }
      }

      function mouseout(d) {
        graph.selectAll(".highlight")
          .classed("highlight", false);
        info.html(msg);
      }

    });
  }

  d3.select("#dateButton")
    .on("click", () => {
      const format = d3.timeParse("%B %Y");

      filtering.startDate = format(d3.select("#startDateMonth").property("value")
        + " " + d3.select("#startDateYear").property("value"));

      filtering.endDate = format(d3.select("#endDateMonth").property("value")
        + " " + d3.select("#endDateYear").property("value"));

      update();
    });

  for (let kind of ["code","issue"]) {
    d3.select("#" + kind + "Check")
      .on("change", function() {
		 
        filtering[kind] = d3.select(this).property("checked");
        update();
      });
  }
  
/*  for (let kind of ["desDef", "feat", "Req", "subtask"]) {
	 
    d3.select("#" + kind + "Check")
      .on("change", function() {
		 if(d3.select(this).property("checked")){
			 filterCount++;
			 if(filterCount > 1){
				 filtering.multiplefilt = true;
			 }
			 
			 if( kind == "desDef"){
			 type += "Design Definition,";
			 }else if( kind == "feat"){
			 type += "Feature,";
			 }else if( kind == "Req "){
			 type += "Requirement,";
			 }else{
				type+="Sub-task,";
			 }
			 
		 }
		filtering.issueType = type;
        update();
		filterCount = 0;
      }); 
  } */
  d3.select("#noLinkNodes")
    .on("click", function() {
      filtering.unconnectedNodes = d3.select(this).property("checked");
      update();
    });


  d3.select("#onlyHighCheck")
    .on("click", function() {
      filtering.onlyHighlighted = d3.select(this).property("checked");
      update();
      if (filtering.onlyHighCheck) {
        d3.selectAll('.radial_link:not(.frozen)').remove();
      }
    });


  d3.select("#issueType")
    .on("change", () => {
      filtering.issueType = d3.select("#issueType").property("value");
      update();
    });


  d3.select("#issueStatus")
    .on("change", () => {
      filtering.issueStatus = d3.select("#issueStatus").property("value");
      update();
    });

  d3.select("#codeStatus")
    .on("change", () => {
      filtering.codeStatus = d3.select("#codeStatus").property("value");
      update();
    });

  d3.select("#clearHighlights")
    .on("click", function() {
      msg = defaultMsg;
      d3.select('#info').html(msg);
      
      d3.selectAll(".clicked").classed("clicked", false);
      
      d3.selectAll(".radial_node.frozen")
        .classed("frozen", false)
        .each(d => d.data.frozen = false);

      d3.selectAll(".radial_link.frozen")
        .classed("frozen", false);

      if (filtering.onlyHighlighted) {
        update();
      }
    });


  connectTextInput("#issueID", "#idButton", "issueID");
  connectTextInput("#issueSummary", "#summaryButton", "issueSummary");
  connectTextInput("#issueDescription", "#descriptionButton", "issueDescription");
  connectTextInput("#codePath", "#pathButton", "codePath");

  function connectTextInput(inputId, buttonId, field) {
    d3.select(buttonId)
      .on("click", () => {
        filtering[field] = d3.select(inputId).property("value");
        update();
      });
    d3.select(inputId)
      .on("keypress", () => {
        if (d3.event.keyCode === 13) {
          filtering[field] = d3.select(inputId).property("value");
          update();
        }
      });
  }

  return radial;
}
