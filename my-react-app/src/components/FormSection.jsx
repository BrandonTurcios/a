import React, { useState } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Tabs, 
  Typography, 
  Divider,
  Space,
  Form
} from 'antd';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

// Componente para renderizar un grupo de campos
const GroupSection = ({ section, fields, form, fieldComponents, level = 0 }) => {
  const { title, fields: sectionFields, children, colspan, col } = section;
  
  const cols = parseInt(col) || 4;
  const span = parseInt(colspan) || 4;
  
  return (
    <Card 
      title={
        <span
          style={{
            color: '#015D70',
            fontWeight: 600,
            fontSize: '16px',
            letterSpacing: '0.02em'
          }}
        >
          {title}
        </span>
      }
      size="small"
      style={{ 
        marginBottom: 10,
        marginLeft: level * 10,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid var(--color-neutral-200)',
        boxShadow: '0 4px 12px rgba(1, 76, 107, 0.05)'
      }}
       headStyle={{
         background: 'linear-gradient(120deg, #B3E2E9, #80CEDA, #4DBACA)',
         padding: '8px 12px',
         borderBottom: '1px solid rgba(255,255,255,0.35)'
       }}
      bodyStyle={{ padding: '10px', background: 'var(--color-card-background)', overflow: 'visible' }}
    >
      <Row gutter={[10, 10]}>
        {/* Renderizar campos directos del grupo */}
        {sectionFields?.map((fieldName, index) => {
          const fieldComponent = fieldComponents[fieldName];
          console.log(`🔍 Rendering field ${fieldName} in group "${title}":`, { fieldComponent: !!fieldComponent, fieldComponents: Object.keys(fieldComponents) });
          if (!fieldComponent) {
            console.warn(`⚠️ No component found for field: ${fieldName}`);
            return null;
          }
          
          // Calcular span con más espacio cuando hay muchos campos
          let baseSpan = Math.floor(24 / cols);
          // Si hay más de 4 campos, dar más espacio a cada uno
          if (sectionFields && sectionFields.length > 4) {
            baseSpan = Math.max(baseSpan, Math.floor(24 / Math.min(sectionFields.length, 4)));
          }
          const fieldSpan = fieldComponent?.props?.['data-span'] ?? baseSpan;
          
          // Asegurar un ancho mínimo para campos que lo requieran (Many2OneField, etc.)
          const minWidth = fieldComponent?.props?.['data-min-width'] || "0";
          
          return (
            <Col key={`field-${fieldName}-${index}`} span={fieldSpan} style={{ minWidth: minWidth, overflow: "visible", width: "100%" }}>
              <div style={{ width: "100%", minWidth: minWidth, overflow: "visible" }}>
                {fieldComponent}
              </div>
            </Col>
          );
        })}
        
        {/* Renderizar sub-secciones */}
        {children?.map((childSection, index) => (
          <Col key={`child-${index}`} span={24}>
            <FormSectionRenderer 
              section={childSection}
              fields={fields}
              form={form}
              fieldComponents={fieldComponents}
              level={level + 1}
            />
          </Col>
        ))}
      </Row>
    </Card>
  );
};

// Componente para renderizar una página
const PageSection = ({ section, fields, form, fieldComponents, level = 0 }) => {
  const { title, fields: sectionFields, children, states } = section;
  
  return (
    <div style={{ marginLeft: level * 16 }}>
      {/* Título de la página si no está en un tab */}
      {level === 0 && title && (
        <Title
          level={4}
          style={{
            marginBottom: 10,
            color: '#015D70',
            fontWeight: 600,
            letterSpacing: '0.02em'
          }}
        >
          {title}
        </Title>
      )}
      
      <Row gutter={[10, 10]}>
        {/* Renderizar campos directos de la página */}
        {sectionFields?.map((fieldName, index) => {
          const fieldComponent = fieldComponents[fieldName];
          if (!fieldComponent) return null;
          const span = fieldComponent?.props?.['data-span'] ?? 12;
          
          return (
            <Col key={`field-${fieldName}-${index}`} span={span} style={{ minWidth: 0, overflow: "visible", width: "100%" }}>
              <div style={{ width: "100%", minWidth: 0, overflow: "visible" }}>
                {fieldComponent}
              </div>
            </Col>
          );
        })}
        
        {/* Renderizar sub-secciones */}
        {children?.map((childSection, index) => (
          <Col key={`child-${index}`} span={24}>
            <FormSectionRenderer 
              section={childSection}
              fields={fields}
              form={form}
              fieldComponents={fieldComponents}
              level={level + 1}
            />
          </Col>
        ))}
      </Row>
    </div>
  );
};

// Componente para renderizar un notebook con tabs
const NotebookSection = ({ section, fields, form, fieldComponents, level = 0 }) => {
  const { title, pages, states } = section;
  
  return (
    <div style={{ marginLeft: level * 16 }}>
      {/* Título del notebook si no está en un tab */}
      {level === 0 && title && (
        <Title
          level={4}
          style={{
            marginBottom: 10,
            color: '#015D70',
            fontWeight: 600,
            letterSpacing: '0.02em'
          }}
        >
          {title}
        </Title>
      )}
      
      <Tabs 
        defaultActiveKey={pages?.[0]?.id || '0'}
        type="card"
        size="small"
        style={{ marginTop: 10 }}
      >
        {pages?.map((page, index) => (
          <TabPane 
            tab={page.title} 
            key={page.id || index}
            style={{ padding: '8px 0' }}
          >
            <FormSectionRenderer 
              section={page}
              fields={fields}
              form={form}
              fieldComponents={fieldComponents}
              level={level + 1}
            />
          </TabPane>
        ))}
      </Tabs>
    </div>
  );
};

// Componente para renderizar separadores
const SeparatorSection = ({ section }) => {
  const { title } = section;
  
  if (title) {
    return (
      <Divider orientation="left" style={{ margin: '12px 0' }}>
        <Text
          strong
          style={{
            color: '#015D70',
            fontWeight: 600,
            fontSize: '15px',
            letterSpacing: '0.02em'
          }}
        >
          {title}
        </Text>
      </Divider>
    );
  }
  
  return <div style={{ height: 8 }} />;
};

// Renderizador principal de secciones
const FormSectionRenderer = ({ section, fields, form, fieldComponents, level = 0 }) => {
  if (!section) return null;

  switch (section.type) {
    case 'group':
      return (
        <GroupSection
          section={section}
          fields={fields}
          form={form}
          fieldComponents={fieldComponents}
          level={level}
        />
      );

    case 'page':
      return (
        <PageSection
          section={section}
          fields={fields}
          form={form}
          fieldComponents={fieldComponents}
          level={level}
        />
      );

    case 'notebook':
      return (
        <NotebookSection
          section={section}
          fields={fields}
          form={form}
          fieldComponents={fieldComponents}
          level={level}
        />
      );

    case 'separator':
      return <SeparatorSection section={section} />;


    default:
      console.warn('Unknown section type:', section.type);
      return null;
  }
};

// Componente principal para renderizar formularios con secciones
const FormSections = ({ 
  sections, 
  fields, 
  form, 
  fieldComponents,
  loading = false 
}) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Text>Loading...</Text>
      </div>
    );
  }

  if (!sections || sections.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Text type="secondary">No sections available</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '6px' }}>
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {sections.map((section, index) => (
          <FormSectionRenderer
            key={`section-${section.id || index}`}
            section={section}
            fields={fields}
            form={form}
            fieldComponents={fieldComponents}
            level={0}
          />
        ))}
      </Space>
    </div>
  );
};

export default FormSections;
