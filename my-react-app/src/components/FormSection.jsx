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
      title={title}
      size="small"
      style={{ 
        marginBottom: 16,
        marginLeft: level * 16
      }}
      bodyStyle={{ padding: '16px' }}
    >
      <Row gutter={[16, 16]}>
        {/* Renderizar campos directos del grupo */}
        {sectionFields?.map((fieldName, index) => {
          const fieldComponent = fieldComponents[fieldName];
          console.log(`🔍 Rendering field ${fieldName} in group "${title}":`, { fieldComponent: !!fieldComponent, fieldComponents: Object.keys(fieldComponents) });
          if (!fieldComponent) {
            console.warn(`⚠️ No component found for field: ${fieldName}`);
            return null;
          }
          
          const fieldSpan = Math.floor(24 / cols);
          
          return (
            <Col key={`field-${fieldName}-${index}`} span={fieldSpan}>
              {fieldComponent}
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
        <Title level={4} style={{ marginBottom: 16 }}>
          {title}
        </Title>
      )}
      
      <Row gutter={[16, 16]}>
        {/* Renderizar campos directos de la página */}
        {sectionFields?.map((fieldName, index) => {
          const fieldComponent = fieldComponents[fieldName];
          if (!fieldComponent) return null;
          
          return (
            <Col key={`field-${fieldName}-${index}`} span={12}>
              {fieldComponent}
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
        <Title level={4} style={{ marginBottom: 16 }}>
          {title}
        </Title>
      )}
      
      <Tabs 
        defaultActiveKey={pages?.[0]?.id || '0'}
        type="card"
        size="small"
        style={{ marginTop: 16 }}
      >
        {pages?.map((page, index) => (
          <TabPane 
            tab={page.title} 
            key={page.id || index}
            style={{ padding: '16px 0' }}
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
      <Divider orientation="left" style={{ margin: '24px 0' }}>
        <Text strong>{title}</Text>
      </Divider>
    );
  }
  
  return <div style={{ height: 16 }} />;
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
        <Text>Loading form...</Text>
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
    <div style={{ padding: '16px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
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
