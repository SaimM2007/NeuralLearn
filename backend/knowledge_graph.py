from langchain_google_genai import ChatGoogleGenerativeAI
import os
import json
import re
import networkx as nx
from dotenv import load_dotenv

load_dotenv()

class KnowledgeGraphBuilder:
    def __init__(self):
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=self.gemini_api_key,
            temperature=0.5
        )
    
    async def build_graph(self, content: str, topic: str):
        """Build knowledge graph from content"""
        
        prompt = f"""Extract key concepts and their relationships from this content about {topic}.

Content:
{content[:4000]}

Return ONLY a valid JSON object with this structure:
{{
  "nodes": [
    {{"id": "concept1", "label": "Concept Name", "type": "core/supporting/detail"}}
  ],
  "edges": [
    {{"source": "concept1", "target": "concept2", "relationship": "leads to/requires/part of"}}
  ]
}}

Extract 10-15 key concepts and their relationships.

JSON:"""
        
        response = await self.llm.ainvoke(prompt)
        
        try:
            # Extract JSON from response
            content = response.content
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                graph_data = json.loads(json_match.group())
            else:
                graph_data = json.loads(content)
            
            # Validate structure
            if 'nodes' not in graph_data or 'edges' not in graph_data:
                raise ValueError("Invalid graph structure")
            
            # Add positions using NetworkX force-directed layout
            G = nx.Graph()
            for node in graph_data['nodes']:
                G.add_node(node['id'])
            for edge in graph_data['edges']:
                G.add_edge(edge['source'], edge['target'])
            
            # Calculate positions
            pos = nx.spring_layout(G, k=2, iterations=50)
            
            # Add positions to nodes (scale for visualization)
            for node in graph_data['nodes']:
                if node['id'] in pos:
                    node['x'] = float(pos[node['id']][0] * 300)
                    node['y'] = float(pos[node['id']][1] * 300)
            
            return graph_data
        except Exception as e:
            # Fallback: return basic graph structure
            return {
                "nodes": [
                    {"id": "main_topic", "label": topic, "type": "core", "x": 0, "y": 0}
                ],
                "edges": []
            }
    
    async def generate_concept_explanation(self, concept: str, context: str):
        """Generate detailed explanation for a concept"""
        prompt = f"""Explain the concept: {concept}

Context: {context[:1000]}

Provide a clear, educational explanation suitable for a student.

Explanation:"""
        
        response = await self.llm.ainvoke(prompt)
        return response.content
    
    async def generate_mermaid_diagram(self, topic: str, content: str):
        """Generate Mermaid diagram code for visualization"""
        prompt = f"""Create a Mermaid flowchart diagram showing the key concepts and flow for: {topic}

Content:
{content[:2000]}

Return ONLY the Mermaid syntax code (starting with 'graph TD' or 'graph LR').

Mermaid code:"""
        
        response = await self.llm.ainvoke(prompt)
        return response.content