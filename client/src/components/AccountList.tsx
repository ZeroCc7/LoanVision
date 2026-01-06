import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select, Space, Tag, Popconfirm, App } from 'antd';
import { PlusOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../api/axios';

interface Account {
  id: number;
  name: string;
  type: 'credit_card' | 'commercial_loan';
  total_amount: number;
  periods: number;
  monthly_payment: number;
  start_date: string;
  payment_day: number;
  status: 'active' | 'closed';
  remaining_periods?: number;
}

interface AccountListProps {
  type: 'credit_card' | 'commercial_loan';
  title: string;
}

const AccountList: React.FC<AccountListProps> = ({ type, title }) => {
  const { message } = App.useApp();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [repayments, setRepayments] = useState<any[]>([]);
  const [form] = Form.useForm();

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/accounts');
      const filteredAccounts = data.filter((acc: Account) => acc.type === type);
      
      // 获取每个账户的还款计划以计算剩余期数
      const accountsWithRemaining = await Promise.all(filteredAccounts.map(async (acc: Account) => {
        try {
          const { data: repayments } = await api.get(`/repayments/account/${acc.id}`);
          const remaining = repayments.filter((r: any) => r.status === 'pending').length;
          return { ...acc, remaining_periods: remaining };
        } catch (e) {
          return acc;
        }
      }));
      
      setAccounts(accountsWithRemaining);
    } catch (error) {
      message.error('获取列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchRepayments = async (accountId: number) => {
    try {
      const { data } = await api.get(`/repayments/account/${accountId}`);
      setRepayments(data);
    } catch (error) {
      message.error('获取还款计划失败');
    }
  };

  const showSchedule = (account: Account) => {
    setCurrentAccount(account);
    fetchRepayments(account.id);
    setScheduleModalVisible(true);
  };

  const handleToggleStatus = async (repaymentId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
      await api.patch(`/repayments/${repaymentId}`, { status: newStatus });
      message.success(`已标记为${newStatus === 'paid' ? '已还' : '待还'}`);
      if (currentAccount) {
        fetchRepayments(currentAccount.id);
      }
      fetchAccounts();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleBatchPay = async () => {
    if (!currentAccount) return;
    try {
      const { data } = await api.post(`/repayments/batch-pay/${currentAccount.id}`);
      message.success(`成功一键还款 ${data.updated} 笔`);
      fetchRepayments(currentAccount.id);
      fetchAccounts();
    } catch (error) {
      message.error('操作失败');
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [type]);

  const handleAdd = async (values: any) => {
    try {
      const { monthly_interest, monthly_payment, start_date, repayment_method, principal_amount, ...rest } = values;
      
      let finalMonthlyPayment = 0;
      if (repayment_method === 'interest_first') {
        // 先息后本：后端需要的 monthly_payment 是每期的利息部分
        finalMonthlyPayment = monthly_interest || 0;
      } else {
        // 等额本息：每期还款额 = 填写的本金部分 + 利息部分
        finalMonthlyPayment = (monthly_payment || 0) + (monthly_interest || 0);
      }

      const payload = {
        ...rest,
        repayment_method: repayment_method || 'equal_installment',
        monthly_payment: finalMonthlyPayment,
        start_date: start_date.format('YYYY-MM-DD'),
      };
      
      await api.post('/accounts', payload);
      message.success('添加成功');
      setModalVisible(false);
      form.resetFields();
      fetchAccounts();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || '添加失败';
      message.error(errorMsg);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/accounts/${id}`);
      message.success('删除成功');
      fetchAccounts();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '总金额', dataIndex: 'total_amount', key: 'total_amount', render: (val: number) => `￥${val.toLocaleString()}` },
    { 
      title: '期数', 
      key: 'periods',
      render: (_: any, record: Account) => (
        <span>
          {record.periods}期 (余 {record.remaining_periods ?? '-'} 期)
        </span>
      )
    },
    { title: '每月还款', dataIndex: 'monthly_payment', key: 'monthly_payment', render: (val: number) => `￥${val.toLocaleString()}` },
    { title: '还款日', dataIndex: 'payment_day', key: 'payment_day', render: (val: number) => `每月${val}日` },
    { title: '开始日期', dataIndex: 'start_date', key: 'start_date' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'gray'}>
          {status === 'active' ? '进行中' : '已结清'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Account) => (
        <Space size="middle">
          <Button type="link" icon={<EyeOutlined />} onClick={() => showSchedule(record)}>详情</Button>
          <Popconfirm title="确定删除吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const scheduleColumns = [
    { title: '期数', dataIndex: 'period_number', key: 'period_number' },
    { title: '金额', dataIndex: 'amount', key: 'amount', render: (val: number) => `￥${val.toLocaleString()}` },
    { title: '应还日期', dataIndex: 'due_date', key: 'due_date' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'paid' ? 'green' : 'orange'}>
          {status === 'paid' ? '已还' : '待还'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Button 
          type="link" 
          size="small" 
          onClick={() => handleToggleStatus(record.id, record.status)}
        >
          {record.status === 'pending' ? '标记已还' : '撤销已还'}
        </Button>
      ),
    },
  ];

  const handleValuesChange = (_: any, allValues: any) => {
    const { periods, monthly_payment, monthly_interest, repayment_method, principal_amount } = allValues;
    
    if (repayment_method === 'interest_first') {
      // 先息后本
      if (periods && principal_amount) {
        // 总金额 = 本金 + (利息 * 期数)
        const total = (principal_amount || 0) + (periods * (monthly_interest || 0));
        form.setFieldsValue({ 
          total_amount: parseFloat(total.toFixed(2)),
          monthly_payment: monthly_interest || 0 // 这里的 monthly_payment 传给后端作为“非最后一期”的还款额（即利息）
        });
      }
    } else {
      // 等额本息 (默认)
      if (periods && monthly_payment) {
        // 总金额 = 期数 * (每期本金/还款额 + 每期利息)
        const total = periods * (monthly_payment + (monthly_interest || 0));
        form.setFieldsValue({ total_amount: parseFloat(total.toFixed(2)) });
      }
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
          新增账目
        </Button>
      </div>

      <Table columns={columns} dataSource={accounts} rowKey="id" loading={loading} />

      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 32 }}>
            <span>{currentAccount?.name} - 还款计划</span>
            <Popconfirm
              title="一键还款确认"
              description="系统将自动把所有「今天及以前」的待还记录标记为已还，确定吗？"
              onConfirm={handleBatchPay}
              okText="确定"
              cancelText="取消"
            >
              <Button type="primary" size="small" ghost>一键还款</Button>
            </Popconfirm>
          </div>
        }
        open={scheduleModalVisible}
        onCancel={() => setScheduleModalVisible(false)}
        footer={null}
        width={700}
      >
        <Table columns={scheduleColumns} dataSource={repayments} rowKey="id" pagination={{ pageSize: 12 }} />
      </Modal>

      <Modal
        title={`新增${title}`}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={handleAdd} 
          onValuesChange={handleValuesChange}
          initialValues={{ type: type, repayment_method: 'equal_installment' }}
        >
          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item name="name" label="账目名称" rules={[{ required: true }]} style={{ flex: 2 }}>
              <Input placeholder="例如：招商银行信用卡" />
            </Form.Item>
            <Form.Item name="type" label="账目类型" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select>
                <Select.Option value="commercial_loan">商业贷款/分期</Select.Option>
                <Select.Option value="credit_card">信用卡账单</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}>
            {({ getFieldValue }) => getFieldValue('type') === 'commercial_loan' && (
              <Form.Item name="repayment_method" label="还款方式" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="equal_installment">等额本息 / 等额本金</Select.Option>
                  <Select.Option value="interest_first">先息后本</Select.Option>
                </Select>
              </Form.Item>
            )}
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="periods" label="总期数" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} min={1} precision={0} placeholder="期数" />
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.repayment_method !== currentValues.repayment_method}>
              {({ getFieldValue }) => (
                getFieldValue('repayment_method') === 'interest_first' ? (
                  <Form.Item name="principal_amount" label="贷款本金" rules={[{ required: true }]} style={{ flex: 1 }}>
                    <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="本金金额" />
                  </Form.Item>
                ) : (
                  <Form.Item name="monthly_payment" label="每期还款额" rules={[{ required: true }]} style={{ flex: 1 }}>
                    <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="金额" />
                  </Form.Item>
                )
              )}
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="monthly_interest" label="每月利息/手续费 (选填)" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="每期利息" />
            </Form.Item>
            <Form.Item name="total_amount" label="总金额 (自动计算)" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} min={0} precision={2} disabled placeholder="自动汇总" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="start_date" label="首次还款日期" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="payment_day" label="每月还款日" rules={[{ required: true, type: 'number', min: 1, max: 31 }]} style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} min={1} max={31} placeholder="1-31" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AccountList;
