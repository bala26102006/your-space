import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { db } from '../db';

/**
 * Extracts plain text from TipTap Prosemirror JSON content.
 */
const extractText = (content) => {
  if (!content) return '';
  let text = '';
  const traverse = (node) => {
    if (node.type === 'text') {
      text += node.text;
    }
    if (node.type === 'paragraph') {
      text += '\n';
    }
    if (node.content) {
      node.content.forEach(traverse);
    }
  };
  if (content.content) {
    content.content.forEach(traverse);
  }
  return text.trim();
};

/**
 * Fetches the full project hierarchy (Project -> Subprojects -> Notes).
 */
const getProjectData = async (projectId) => {
  const project = await db.projects.get(projectId);
  if (!project) return null;

  const subprojects = await db.subprojects
    .where('project_id')
    .equals(projectId)
    .toArray();
  
  // Sort subprojects
  subprojects.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const subprojectIds = subprojects.map(sp => sp.id);
  
  const notes = await db.notes
    .where('subproject_id')
    .anyOf(subprojectIds)
    .toArray();

  const formattedSubprojects = subprojects.map(sp => ({
    ...sp,
    notes: notes
      .filter(n => n.subproject_id === sp.id && !n.is_deleted && !n.is_archived)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  }));

  return {
    ...project,
    subprojects: formattedSubprojects
  };
};

/**
 * Exports a full Project to PDF using jsPDF.
 */
export const exportProjectToPDF = async (projectId) => {
  const projectData = await getProjectData(projectId);
  if (!projectData) return;

  const doc = new jsPDF();
  let yPos = 20;
  const margin = 20;
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;

  // Title
  doc.setFontSize(24);
  doc.text(projectData.title || 'Untitled Project', margin, yPos);
  yPos += 15;

  if (projectData.description) {
    doc.setFontSize(12);
    const splitDesc = doc.splitTextToSize(projectData.description, maxWidth);
    doc.text(splitDesc, margin, yPos);
    yPos += splitDesc.length * 7 + 10;
  }

  for (const sp of projectData.subprojects) {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(18);
    doc.text(sp.title || 'Untitled Section', margin, yPos);
    yPos += 10;

    for (const note of sp.notes) {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.text(note.title || 'Untitled Note', margin, yPos);
      yPos += 7;

      doc.setFontSize(11);
      const rawText = extractText(note.content);
      if (rawText) {
        const splitText = doc.splitTextToSize(rawText, maxWidth);
        
        for (const line of splitText) {
          if (yPos > pageHeight - 15) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, margin, yPos);
          yPos += 6;
        }
      }
      yPos += 10;
    }
    yPos += 10;
  }

  doc.save(`${projectData.title || 'project'}.pdf`);
};

/**
 * Exports a full Project to Word using docx.
 */
export const exportProjectToWord = async (projectId) => {
  const projectData = await getProjectData(projectId);
  if (!projectData) return;

  const children = [];

  // Project Title
  children.push(
    new Paragraph({
      text: projectData.title || 'Untitled Project',
      heading: HeadingLevel.TITLE,
    })
  );

  if (projectData.description) {
    children.push(
      new Paragraph({
        children: [new TextRun(projectData.description)],
      })
    );
  }

  // Subprojects & Notes
  for (const sp of projectData.subprojects) {
    children.push(
      new Paragraph({
        text: sp.title || 'Untitled Section',
        heading: HeadingLevel.HEADING_1,
      })
    );

    for (const note of sp.notes) {
      children.push(
        new Paragraph({
          text: note.title || 'Untitled Note',
          heading: HeadingLevel.HEADING_2,
        })
      );

      const rawText = extractText(note.content);
      if (rawText) {
        rawText.split('\n').forEach(paragraphText => {
          if (paragraphText.trim()) {
            children.push(
              new Paragraph({
                children: [new TextRun(paragraphText)],
              })
            );
          }
        });
      }
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectData.title || 'project'}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
