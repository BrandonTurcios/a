import React from 'react';
import { Typography } from 'antd';
import TrytonTable from '../../components/TrytonTable';

const { Title, Paragraph } = Typography;

const TableView = ({ tableInfo, selectedMenuInfo }) => {
  return (
    <div style={{
      padding: '24px',
      background: '#F8F9FA',
      minHeight: 'calc(100vh - 64px)',
      overflowY: 'auto'
    }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#333333' }}>
          {selectedMenuInfo?.actionName || selectedMenuInfo?.menuItem?.name || 'Table'}
        </Title>
        <Paragraph style={{ color: '#6C757D', margin: '8px 0 0 0' }}>
          {selectedMenuInfo?.resModel} - Table view
        </Paragraph>
      </div>

      <TrytonTable
        model={tableInfo.model}
        viewId={tableInfo.viewId}
        viewType={tableInfo.viewType}
        domain={[]}
        limit={100}
        title={selectedMenuInfo?.actionName}
      />
    </div>
  );
};

export default TableView;
