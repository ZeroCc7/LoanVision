import React, { useState, useEffect } from 'react';
import { Table, Tag, DatePicker, Card, Typography, App } from 'antd';
import api from '../api/axios';
import dayjs from 'dayjs';

const { Title } = Typography;

const HistoryPage: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));

  const fetchHistory = async (targetMonth: string) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/repayments/monthly/${targetMonth}`);
      setData(data.items);
    } catch (error) {
      message.error('获取历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(month);
  }, [month]);

  const columns = [
    { title: '账目名称', dataIndex: 'account_name', key: 'account_name' },
    {
      title: '类型',
      dataIndex: 'account_type',
      key: 'account_type',
      render: (type: string) => (
        <Tag color={type === 'credit_card' ? 'blue' : 'gold'}>
          {type === 'credit_card' ? '信用卡' : '商业贷款'}
        </Tag>
      ),
    },
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
      title: '还款时间',
      dataIndex: 'paid_at',
      key: 'paid_at',
      render: (val: string) => val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-',
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>还款历史</Title>
        <DatePicker
          picker="month"
          value={dayjs(month, 'YYYY-MM')}
          onChange={(date) => date && setMonth(date.format('YYYY-MM'))}
          allowClear={false}
        />
      </div>

      <Card variant="borderless">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default HistoryPage;
