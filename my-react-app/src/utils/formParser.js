// Parser para extraer secciones y organizar campos del XML de Tryton
export const parseFormSections = (fieldsView) => {
  if (!fieldsView || !fieldsView.arch) {
    return { sections: [], fields: {} };
  }

  const arch = fieldsView.arch;
  const fields = fieldsView.fields || {};
  
  // Crear un parser XML simple
  const parseXML = (xmlString) => {
    const parser = new DOMParser();
    return parser.parseFromString(xmlString, 'text/xml');
  };

  const extractSections = (element, currentPath = [], level = 0) => {
    const sections = [];
    const maxLevel = 3; // Limitar profundidad para evitar recursión infinita

    if (level > maxLevel) return sections;

    Array.from(element.children).forEach(child => {
      const tagName = child.tagName.toLowerCase();
      const attributes = Array.from(child.attributes).reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {});

      switch (tagName) {
        case 'group':
          const groupTitle = attributes.string || attributes.id || 'Group';
          const groupSection = {
            type: 'group',
            title: groupTitle,
            id: attributes.id,
            path: [...currentPath, groupTitle],
            level: level,
            colspan: attributes.colspan,
            col: attributes.col,
            fields: [],
            children: []
          };

          // Extraer campos del grupo
          const groupFields = extractFieldsFromElement(child, fields);
          groupSection.fields = groupFields;
          console.log(`🔍 Group "${groupTitle}" extracted fields:`, groupFields);

          // Procesar sub-elementos
          const groupSubSections = extractSections(child, [...currentPath, groupTitle], level + 1);
          groupSection.children = groupSubSections;

          sections.push(groupSection);
          break;

        case 'notebook':
          const notebookTitle = attributes.string || 'Notebook';
          const notebookSection = {
            type: 'notebook',
            title: notebookTitle,
            id: attributes.id,
            path: [...currentPath, notebookTitle],
            level: level,
            pages: []
          };

          // Procesar páginas del notebook
          const notebookPages = extractSections(child, [...currentPath, notebookTitle], level + 1);
          notebookSection.pages = notebookPages;

          sections.push(notebookSection);
          break;

        case 'page':
          const pageTitle = attributes.string || attributes.id || 'Page';
          const pageSection = {
            type: 'page',
            title: pageTitle,
            id: attributes.id,
            path: [...currentPath, pageTitle],
            level: level,
            states: attributes.states,
            fields: [],
            children: []
          };

          // Extraer campos de la página
          const pageFields = extractFieldsFromElement(child, fields);
          pageSection.fields = pageFields;
          console.log(`🔍 Page "${pageTitle}" extracted fields:`, pageFields);

          // Procesar sub-elementos (puede haber grupos dentro de páginas)
          const pageChildren = extractSections(child, [...currentPath, pageTitle], level + 1);
          pageSection.children = pageChildren;

          sections.push(pageSection);
          break;

        case 'newline':
          // Agregar separador
          sections.push({
            type: 'separator',
            title: '',
            level: level,
            path: [...currentPath]
          });
          break;

        case 'separator':
          sections.push({
            type: 'separator',
            title: attributes.string || '',
            level: level,
            path: [...currentPath]
          });
          break;

        default:
          // Procesar otros elementos recursivamente
          const defaultSubSections = extractSections(child, currentPath, level + 1);
          sections.push(...defaultSubSections);
          break;
      }
    });

    return sections;
  };

  const extractFieldsFromElement = (element, allFields) => {
    const fieldNames = [];
    
    const extractFields = (el) => {
      Array.from(el.children).forEach(child => {
        if (child.tagName.toLowerCase() === 'field') {
          const fieldName = child.getAttribute('name');
          console.log(`🔍 Found field element: ${fieldName}, exists in allFields:`, !!allFields[fieldName]);
          if (fieldName && allFields[fieldName]) {
            fieldNames.push(fieldName);
          }
        } else {
          extractFields(child);
        }
      });
    };

    console.log(`🔍 Extracting fields from element:`, element.tagName, element.children.length, 'children');
    extractFields(element);
    console.log(`🔍 Extracted field names:`, fieldNames);
    return fieldNames;
  };

  try {
    const doc = parseXML(`<root>${arch}</root>`);
    const rootElement = doc.querySelector('root');
    
    if (rootElement) {
      const sections = extractSections(rootElement);
      return {
        sections: sections,
        fields: fields,
        originalArch: arch
      };
    }
  } catch (error) {
    console.error('Error parsing form XML:', error);
  }

  return { sections: [], fields: fields };
};

// Función auxiliar para encontrar todos los campos en una sección (incluyendo sub-secciones)
export const getAllFieldsInSection = (section) => {
  const allFields = new Set();

  const collectFields = (sec) => {
    // Agregar campos directos
    sec.fields?.forEach(field => allFields.add(field));

    // Procesar sub-secciones
    if (sec.children) {
      sec.children.forEach(child => collectFields(child));
    }

    // Procesar páginas en notebooks
    if (sec.pages) {
      sec.pages.forEach(page => collectFields(page));
    }
  };

  collectFields(section);
  return Array.from(allFields);
};

// Función para obtener la estructura de navegación (breadcrumb)
export const getSectionPath = (section) => {
  return section.path?.join(' > ') || section.title || 'Unknown';
};

// Función para encontrar una sección por ID
export const findSectionById = (sections, id) => {
  for (const section of sections) {
    if (section.id === id) {
      return section;
    }

    // Buscar en children
    if (section.children) {
      const found = findSectionById(section.children, id);
      if (found) return found;
    }

    // Buscar en pages
    if (section.pages) {
      const found = findSectionById(section.pages, id);
      if (found) return found;
    }
  }
  return null;
};
