<template>
  <v-card>
    <v-card-title>
      <span class="headline">Encapsulation Visualization</span>
    </v-card-title>
    <v-card-text>
      <div id="treeWrapper"></div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { Protocol } from "@/contracts";
import { onMounted, ref } from "vue";

import axios from "axios";
import { useProtocolStore } from "@/store/ProtocolStore";
import * as d3 from "d3";

const protocolStore = useProtocolStore();

interface TreeItem {
  name: string;
  label: string;
  children: TreeItem[] | ParentProtocolTreeNode[];
}

interface ParentProtocolTreeNode extends Protocol {
  parents: ParentProtocolTreeNode[];
}

const protocolToTreeItem = (
  protocolTreeNode: ParentProtocolTreeNode,
): TreeItem => {
  return {
    name: protocolTreeNode.name,
    label: protocolTreeNode.name,
    children: protocolTreeNode.parents,
  };
};

function mapProtocolTreeToTreeItem(
  parentProtocolTreeNode: ParentProtocolTreeNode,
) {
  const treeItem = protocolToTreeItem(parentProtocolTreeNode);

  if (treeItem.children.length > 0) {
    treeItem.children.forEach((child) => {
      treeItem.children[treeItem.children.indexOf(child as any)] =
        mapProtocolTreeToTreeItem(child as any);
    });
  }

  return treeItem;
}

onMounted(async () => {
  try {
    const result = await axios.get(
      `/protocol-encapsulations/${protocolStore.protocol.id}/tree`,
    );

    let treeData: TreeItem = mapProtocolTreeToTreeItem(result.data);

    const width = 928;

    // Compute the tree height; this approach will allow the height of the
    // SVG to scale according to the breadth (width) of the tree layout.
    const root = d3.hierarchy(treeData);
    const dx = 20;
    const dy = width / (root.height + 1);

    // Create a tree layout.
    const tree = d3.tree().nodeSize([dx, dy]);

    // Sort the tree and apply the layout.
    root.sort((a, b) => d3.ascending(a.data.name, b.data.name));
    tree(root as d3.HierarchyNode<unknown>);

    // Compute the extent of the tree. Note that x and y are swapped here
    // because in the tree layout, x is the breadth, but when displayed, the
    // tree extends right rather than down.
    let x0 = Infinity;
    let x1 = -x0;
    root.each((d) => {
      if (d.x !== undefined && d.x > x1) x1 = d.x;
      if (d.x !== undefined && d.x < x0) x0 = d.x;
    });

    // Compute the adjusted height of the tree.
    const height = x1 - x0 + dx * 2;

    const svg = d3
      .create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-dy / 3, x0 - dx, width, height])
      .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

    const link = svg
      .append("g")
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)
      .selectAll()
      .data(root.links())
      .join("path")
      .attr(
        "d",
        d3
          .linkHorizontal()
          .x((d: any) => d.y)
          .y((d: any) => d.x) as any,
      );

    const node = svg
      .append("g")
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 3)
      .selectAll()
      .data(root.descendants())
      .join("g")
      .attr("transform", (d) => `translate(${d.y},${d.x})`);

    node
      .append("circle")
      .attr("fill", (d) => (d.children ? "#555" : "#999"))
      .attr("r", 2.5);

    node
      .append("text")
      .attr("dy", "0.31em")
      .attr("x", (d) => (d.children ? -6 : 6))
      .attr("text-anchor", (d) => (d.children ? "end" : "start"))
      .text((d) => d.data.name)
      .attr("stroke", "white")
      .attr("paint-order", "stroke");

    const svgNode = svg.node();

    const treeWrapper = d3.select("#treeWrapper");

    if (treeWrapper) {
      treeWrapper.append(() => svgNode);
    }
  } catch (error) {
    console.log(error);
  }
});
</script>
