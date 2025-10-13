import React from 'react';
import { Typography } from 'antd';
import TrytonForm from '../../components/TrytonForm';

const { Title, Paragraph } = Typography;

const FormView = ({ formInfo, selectedMenuInfo }) => {
  return (
    <div style={{
      padding: '24px',
      background: '#F8F9FA',
      minHeight: 'calc(100vh - 64px)',
      overflowY: 'auto'
    }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#333333' }}>
          {selectedMenuInfo?.actionName || selectedMenuInfo?.menuItem?.name || 'Form'}
        </Title>
        <Paragraph style={{ color: '#6C757D', margin: '8px 0 0 0' }}>
          {selectedMenuInfo?.resModel} - Form view
        </Paragraph>
      </div>

      <TrytonForm
        model={formInfo.model}
        viewId={formInfo.viewId}
        recordData={formInfo.recordData}
        onSave={(values) => console.log('Save:', values)}
        onCancel={() => console.log('Cancel')}
      />
    </div>
  );
};

export default FormView;
