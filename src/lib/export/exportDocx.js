import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { db } from '../db';

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

const getProjectData = async (projectId) => {
  const project = await db.projects.get(projectId);
  if (!project) return null;

  const subprojects = await db.subprojects
    .where('project_id')
    .equals(projectId)
    .toArray();
  
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

  return { ...project, subprojects: formattedSubprojects };
};

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
