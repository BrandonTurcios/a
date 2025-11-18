import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      message.error(t('errors.emailTemplateLoad'));
    } finally {
      setEmailLoading(false);
    }
  };

  const handleEmailComplete = async (field, value) => {
    try {
      const results = await trytonService.getEmailComplete(value);
      
      // Results format: [score, name, email]
      const options = results.map(result => ({
        value: result[2], // email is at index 2
        label: result[1]  // name is at index 1
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

      message.success(t('email.sentSuccess'));
      onClose();

    } catch (error) {
      console.error('Error sending email:', error);
      message.error(t('errors.emailSendFailed'));
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
            {t('email.modalTitle')}
          </Title>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleCancel} icon={<CloseOutlined />}>
          {t('common.cancel')}
        </Button>,
        <Button
          key="send"
          type="primary"
          loading={emailLoading}
          onClick={() => form.submit()}
          icon={<SendOutlined />}
        >
          {t('email.send')}
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
            label={t('email.to')}
            name="to"
            rules={[{ required: true, message: t('validation.emailRecipients') }]}
          >
            <AutoComplete
              mode="tags"
              placeholder={t('email.enterAddresses')}
              onSearch={(value) => handleEmailComplete('to', value)}
              options={toOptions}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label={t('email.cc')}
            name="cc"
          >
            <AutoComplete
              mode="tags"
              placeholder={t('email.enterCcAddresses')}
              onSearch={(value) => handleEmailComplete('cc', value)}
              options={ccOptions}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </div>

        <Form.Item
          label={t('email.bcc')}
          name="bcc"
        >
          <AutoComplete
            mode="tags"
            placeholder={t('email.enterBccAddresses')}
            onSearch={(value) => handleEmailComplete('bcc', value)}
            options={bccOptions}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          label={t('email.subject')}
          name="subject"
          rules={[{ required: true, message: t('validation.emailSubject') }]}
        >
          <Input placeholder={t('email.enterSubject')} />
        </Form.Item>

        <Form.Item
          label={t('email.message')}
          name="body"
          rules={[{ required: true, message: t('validation.emailMessage') }]}
        >
          <TextArea
            rows={12}
            placeholder={t('email.enterMessage')}
            style={{ resize: 'vertical' }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EmailModal;
