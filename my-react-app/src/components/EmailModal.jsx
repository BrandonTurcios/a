import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Space, Typography, AutoComplete, message } from 'antd';
import { MailOutlined, SendOutlined, CloseOutlined } from '@ant-design/icons';
import trytonService from '../services/trytonService';

const { TextArea } = Input;
const { Title } = Typography;

const EmailModal = ({ 
  visible, 
  onClose, 
  selectedRecord, 
  model,
  loading = false 
}) => {
  const [form] = Form.useForm();
  const [emailLoading, setEmailLoading] = useState(false);
  const [toOptions, setToOptions] = useState([]);
  const [ccOptions, setCcOptions] = useState([]);
  const [bccOptions, setBccOptions] = useState([]);

  // Load email template data when modal opens
  useEffect(() => {
    if (visible && selectedRecord && model) {
      loadEmailTemplate();
    }
  }, [visible, selectedRecord, model]);

  const loadEmailTemplate = async () => {
    try {
      setEmailLoading(true);
      
      // Get record data with id and rec_name
      const recordData = await trytonService.getRecordData(model, selectedRecord.id, ['id', 'rec_name']);
      
      // Get default email template
      const templateData = await trytonService.getEmailTemplateDefault(model, selectedRecord.id);
      
      // Pre-fill form with template data
      form.setFieldsValue({
        to: templateData.to || [],
        cc: templateData.cc || [],
        bcc: templateData.bcc || [],
        subject: `${templateData.subject || ''} ${recordData.rec_name || ''}`.trim(),
        body: templateData.body || ''
      });
      
    } catch (error) {
      console.error('Error loading email template:', error);
      message.error('Error loading email template');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleEmailComplete = async (field, value) => {
    try {
      const results = await trytonService.getEmailComplete(value);
      
      const options = results.map(result => ({
        value: result.email,
        label: `${result.name} <${result.email}>`
      }));
      
      switch (field) {
        case 'to':
          setToOptions(options);
          break;
        case 'cc':
          setCcOptions(options);
          break;
        case 'bcc':
          setBccOptions(options);
          break;
      }
    } catch (error) {
      console.error('Error getting email completions:', error);
    }
  };

  const handleSend = async (values) => {
    try {
      setEmailLoading(true);
      
      // TODO: Implement actual email sending
      console.log('Sending email:', values);
      
      message.success('Email sent successfully');
      onClose();
      
    } catch (error) {
      console.error('Error sending email:', error);
      message.error('Error sending email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MailOutlined style={{ color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0 }}>
            Send Email
          </Title>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleCancel} icon={<CloseOutlined />}>
          Cancel
        </Button>,
        <Button 
          key="send" 
          type="primary" 
          loading={emailLoading}
          onClick={() => form.submit()}
          icon={<SendOutlined />}
        >
          Send
        </Button>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSend}
        disabled={emailLoading}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item
            label="To"
            name="to"
            rules={[{ required: true, message: 'Please enter recipients' }]}
          >
            <AutoComplete
              mode="tags"
              placeholder="Enter email addresses"
              onSearch={(value) => handleEmailComplete('to', value)}
              options={toOptions}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label="Cc"
            name="cc"
          >
            <AutoComplete
              mode="tags"
              placeholder="Enter CC addresses"
              onSearch={(value) => handleEmailComplete('cc', value)}
              options={ccOptions}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </div>

        <Form.Item
          label="Bcc"
          name="bcc"
        >
          <AutoComplete
            mode="tags"
            placeholder="Enter BCC addresses"
            onSearch={(value) => handleEmailComplete('bcc', value)}
            options={bccOptions}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          label="Subject"
          name="subject"
          rules={[{ required: true, message: 'Please enter subject' }]}
        >
          <Input placeholder="Enter email subject" />
        </Form.Item>

        <Form.Item
          label="Message"
          name="body"
          rules={[{ required: true, message: 'Please enter message' }]}
        >
          <TextArea
            rows={12}
            placeholder="Enter your message here..."
            style={{ resize: 'vertical' }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EmailModal;
