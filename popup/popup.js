document.addEventListener('DOMContentLoaded', async () => {
  // 初始加载
  const { nodes = [], edges = [] } = await chrome.storage.local.get(['nodes', 'edges']);
  renderGraph(nodes, edges);

  // 添加实时监听
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.nodes || changes.edges) {
      d3.select("svg").remove();
      renderGraph(changes.nodes?.newValue || nodes, 
                 changes.edges?.newValue || edges);
    }
  });
});

function renderGraph(nodes, edges) {
  const width = 800;
  const height = 600;

  const svg = d3.select("#graph-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // 添加缩放容器
  const zoomContainer = svg.append("g");

  // 创建缩放行为
  const zoom = d3.zoom()
    .scaleExtent([0.1, 8])  // 缩放范围
    .on("zoom", (event) => {
      zoomContainer.attr("transform", event.transform);
    });

  // 添加滚轮缩放支持
  svg.call(zoom)
    .on("dblclick.zoom", null) // 禁用双击缩放
    .on("wheel.zoom", function(event) {
      if (event.ctrlKey) {
        zoom.scaleBy(svg, Math.pow(2, event.deltaY * -0.01));
      }
    });


  // 创建力导向模拟
  const simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(d => d.id).distance(100))
    .force("charge", d3.forceManyBody().strength(-50))
    .force("center", d3.forceCenter(width / 2, height / 2));

  // 修改边的绘制方式
  const link = zoomContainer.append("g")
    .selectAll("line")
    .data(edges)
    .join("line")
    .attr("class", "link")
    .style("stroke", "#999")  // 明确设置颜色
    .style("stroke-width", 1.5); // 增加线宽

  // 计算节点连接状态
  const connectedNodes = new Set();
  edges.forEach(edge => {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  });

  // 修改节点颜色设置
  const node = zoomContainer.append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("class", "node")
    .attr("r", 8)
    .style("fill", d => 
      connectedNodes.has(d.id) ? "#4CAF50" : "#FF5722") // 绿色为连接节点，橙色为孤立节点
    .call(drag(simulation));

  // 在节点定义后添加点击事件
  node.on("click", (event, d) => {
    chrome.tabs.create({ url: d.id });
  });
  
  // 添加节点标签
  const labels = zoomContainer.append("g")
  .selectAll("text")
  .data(nodes)
  .join("text")
  .text(d => d.title.substring(0, 20) + (d.title.length > 20 ? "..." : ""))
  .attr("class", "node-label")
  .attr("dx", 12)
  .attr("dy", 4);
  
  // 修改标签点击事件
  labels.style("cursor", "pointer")
    .on("click", (event, d) => {
      chrome.tabs.create({ url: d.id });
    });

  // 更新模拟器
  simulation.nodes(nodes).on("tick", ticked);
  simulation.force("link").links(edges);

  function ticked() {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);

    labels
      .attr("x", d => d.x)
      .attr("y", d => d.y);
  }

  function drag(simulation) {
    return d3.drag()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
        simulation.alpha(0.3);
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }
}