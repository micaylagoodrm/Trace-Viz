const radial = new Radial();

async function getData() {

    const droneData = await d3.json("drone.json");

    const allNodes = [];
    const allLinks = [];
	const codeLinks =[];

    const parseTime = d3.timeParse("%Y-%m-%dT%H:%M:%SZ");//2018-05-08T23:05:56Z

    formatNode(droneData["entries"]);
    addLinkSourceTarget(droneData["entries"]);

    function formatNode(data){
        data.forEach(d => {
            var node1 = {};
            node1.type = d["attributes"]["issuetype"]; //needs to be issuetype
            node1.issuetype = d["attributes"]["issuetype"];
			node1.category = "issue";
            node1.id = d["issueid"];
            node1.status = d["attributes"]["status"];
            node1.summary = d["attributes"]["summary"];
            node1.description = d["attributes"]["description"];
			node1.children = (d["children"]||d["children"]["refinedby"]|| d["children"]["subtasks"] || d["children"]["contains"] );
			        
		   allNodes.push(node1); 
           for (var codeNode of d["code"]){
                var node2 = {};
                node2.type = "code";
				node2.category = "code";
                node2.code_status = codeNode["status"];
                node2.id = codeNode["filename"];
                node2.timestamp = parseTime(codeNode["timestamp"]);
                allNodes.push(node2);
           }
        })
    }

    function addLinkSourceTarget(data) {
        data.forEach(d => {
            childKeyName = Object.keys(d["children"])
            if (childKeyName.length > 0){
                for (var children of d["children"][childKeyName[0]]){
                    var link1 = {};
                    link1.source = d["issueid"];
                    link1.link_property = childKeyName[0];
                    link1.target = children
                    allLinks.push(link1);
                }
            } else{  
            // pass 
            }
            if (d.code.length > 0){
                for (var codeNode of d["code"]){
                    var link2 = {};
                    link2.source = d["issueid"];
                    link2.code_status = codeNode.status
                    link2.target = codeNode.filename
                    link2.timestamp = parseTime(codeNode["timestamp"]);
                    allLinks.push(link2);
					codeLinks.push(link2);
                }
            }else{  
            // pass 
            }
        })
		//Take out if we dont want full traceability
		 data.forEach(d=> {
			if (d.code.length > 0){
				//pass
               
            }else{
				childKeyName = Object.keys(d["children"])
				if (childKeyName.length > 0){
					for (var children of d["children"][childKeyName[0]]){
						for (var code of codeLinks){
								if(children == code.source){
									var link3 ={};
									link3.source = d["issueid"];
									link3.code_status = code.code_status;
									link3.target = code.target;
									link3.timestamp = code.timestamp;
									allLinks.push(link3);
								}
						}
					}
				}
            // pass 
            }
        })	 
		
    }
    console.log(allNodes)
    console.log(allLinks)
    return { 'nodes': allNodes, 'links': allLinks };
}

getData().then(data => {
    setUpDateSelectors(data);
    setUpStatusSelector(data, "code_status", "codeStatus");
    setUpStatusSelector(data, "issuetype", "issueType");
    setUpStatusSelector(data, "status", "issueStatus");

    d3.select("#radial")
        .datum(data)
        .call(radial);
});


function setUpDateSelectors(data) {
    const ext = d3.extent(data.nodes,
        d => d.timestamp ? d.timestamp.getFullYear() : null);
    
    const startDateMonth = document.getElementById("startDateMonth");
    const startDateYear = document.getElementById("startDateYear");

    const endDateMonth = document.getElementById("endDateMonth");
    const endDateYear = document.getElementById("endDateYear");
    
    for (let y of d3.range(ext[0], ext[1] + 1)) {
        startDateYear.appendChild(createOption(y, y));
        endDateYear.appendChild(createOption(y, y));
    }

    const months = ["", "January", "February", "March", "April", "May", "June", "July",
        "August", "September", "October", "November", "December"];

    for(let y of d3.range(1, 13)) {
        startDateMonth.appendChild(createOption(months[y], months[y]));
        endDateMonth.appendChild(createOption(months[y], months[y]));
    }
    
    startDateYear.value = ext[0];
    endDateYear.value = ext[1];

    startDateMonth.value = "January";
    endDateMonth.value = "December";
}



function setUpStatusSelector(data, selector, selectorId) {
    const statusList = Array.from(new Set(data.nodes.map(d => d[selector]))).sort();
    const statusSelector = document.getElementById(selectorId);

    for (let p of statusList) {
        if (typeof p != "undefined"){
            statusSelector.appendChild(createOption(p, p));
        }
    }
    statusSelector.appendChild(createOption("", ""));
    statusSelector.value = "";
}

function createOption(value, text) {
    const option = document.createElement("option");
    option.value = value;
    option.text = text;
    return option;
}
