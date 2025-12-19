import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ApiNode } from './api';

export const exportGraphToMarkdown = async (nodes: any[], edges: any[]) => {
    const zip = new JSZip();
    const folder = zip.folder("rabbit-hole-export");

    if (!folder) return;

    // Helper to format node content
    const formatContent = (node: any) => {
        let content = `# ${node.data.title || 'Untitled'}\n\n`;
        
        // Metadata
        content += `**Source**: ${node.data.url || 'Manual'}\n`;
        content += `**Type**: ${node.type}\n`;
        content += `**Date**: ${new Date().toLocaleDateString()}\n\n`;
        
        // Tags
        if (node.data.tags && node.data.tags.length > 0) {
            content += `Tags: ${node.data.tags.map((t: string) => `#${t}`).join(' ')}\n\n`;
        }

        content += `---\n\n`;

        // Main Content
        if (node.data.content) {
            content += node.data.content;
        } else if (node.data.snippet) {
            content += node.data.snippet;
        }

        // Connections (Backlinks/Outlinks could be computed here if needed, 
        // but simple connection list is good)
        
        return content;
    };

    // Create a file for each node
    nodes.forEach((node) => {
        // Sanitize filename
        const filename = (node.data.title || 'untitled').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.md';
        
        // Handle duplicate filenames
        // (Simple handling: overwritten. Better: check existence. 
        // For this v1, simple is okay, or maybe append ID)
        
        const content = formatContent(node);
        folder.file(filename, content);
    });

    // Create an index file with all links
    let indexContent = `# Index\n\n`;
    nodes.forEach(node => {
        const filename = (node.data.title || 'untitled').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.md';
        indexContent += `- [${node.data.title}](${filename})\n`;
    });
    folder.file("index.md", indexContent);

    // Generate and save
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "rabbit-hole-export.zip");
};
