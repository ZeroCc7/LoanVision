import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, List, Typography, Button, Space, App } from 'antd';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { ArrowUpOutlined, CheckCircleOutlined, ClockCircleOutlined, PayCircleOutlined, CreditCardOutlined, BankOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface DashboardData {
  summary: {
    total_monthly: number;
    paid_monthly: number;
    pending_monthly: number;
    total_remaining: number;
    active_accounts: number;
    total_items: number;
  };
  trend: Array<{ month: string; amount: number }>;
  upcoming: Array<any>;
}

const Dashboard: React.FC = () => {
  const { message } = App.useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const { data } = await api.get('/stats/dashboard');
      setData(data);
    } catch (error) {
      message.error('获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleMarkPaid = async (repaymentId: number) => {
    try {
      await api.patch(`/repayments/${repaymentId}`, { status: 'paid' });
      message.success('标记成功');
      fetchDashboardData();
    } catch (error) {
      message.error('操作失败');
    }
  };

  if (loading || !data) {
    return <div>加载中...</div>;
  }

  const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d'];

  const pieData = [
    { name: '已还', value: data.summary.paid_monthly },
    { name: '待还', value: data.summary.pending_monthly },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>仪表盘</Title>

      {/* Summary Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" className="stat-card">
            <Statistic
              title="本月总应还"
              value={data.summary.total_monthly}
              precision={2}
              prefix="￥"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" className="stat-card">
            <Statistic
              title="本月已还"
              value={data.summary.paid_monthly}
              precision={2}
              prefix="￥"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" className="stat-card">
            <Statistic
              title="本月待还"
              value={data.summary.pending_monthly}
              precision={2}
              prefix="￥"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" className="stat-card">
            <Statistic
              title="总剩余待还"
              value={data.summary.total_remaining}
              precision={2}
              prefix="￥"
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts Section */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="还款趋势 (近6个月)" variant="borderless" style={{ height: '100%' }}>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `￥${value.toLocaleString()}`} />
                  <Line type="monotone" dataKey="amount" stroke="#1890ff" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="本月进度" variant="borderless" style={{ height: '100%' }}>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#52c41a' : '#faad14'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `￥${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Upcoming & Details */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} md={12}>
          <Card title="临近还款提醒 (7天内)" variant="borderless">
            <List
              dataSource={data.upcoming}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button type="primary" size="small" onClick={() => handleMarkPaid(item.id)}>标记已还</Button>
                  ]}
                >
                  <List.Item.Meta
                    title={item.account_name}
                    description={`应还日期: ${item.due_date}`}
                  />
                  <div style={{ fontWeight: 'bold', color: '#f5222d' }}>￥{item.amount.toLocaleString()}</div>
                </List.Item>
              )}
              locale={{ emptyText: '近期无待还款项' }}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="活跃账目概览" variant="borderless">
             <Statistic
              title="活跃账目总数"
              value={data.summary.active_accounts}
              suffix="个"
            />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">本月还款计划包含 {data.summary.total_items} 笔明细</Text>
            </div>
            <div style={{ marginTop: 24 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button type="default" block icon={<CreditCardOutlined />}>
                   <Link to="/credit-cards">查看信用卡分期</Link>
                </Button>
                <Button type="default" block icon={<BankOutlined />}>
                   <Link to="/loans">查看商业贷款</Link>
                </Button>
              </Space>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
