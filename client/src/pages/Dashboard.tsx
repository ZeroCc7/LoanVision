import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, List, Typography, Button, Space, App, Alert, Badge, Segmented, Divider, theme } from 'antd';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { ArrowUpOutlined, CheckCircleOutlined, ClockCircleOutlined, PayCircleOutlined, CreditCardOutlined, BankOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';
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
  trend: Array<{ 
    month: string; 
    amount: number;
    interest_first_amount: number;
    other_amount: number;
    is_warning: boolean;
    warning_msg: string;
  }>;
  upcoming: Array<any>;
  interestFirstAlerts: Array<any>;
  interestFirstSummary: {
    total_count: number;
    total_amount: number;
    active_total_amount: number;
    upcoming_6_months: number;
  };
}

const Dashboard: React.FC = () => {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const isDark = theme.useToken().theme.id === 1; // 这是一个简便判断，或者可以用 token.colorBgBase 亮度
  
  // 更准确的深色模式判断
  const isDarkMode = token.colorBgContainer === '#141414' || token.colorBgContainer === '#000000' || token.colorBgBase === '#000';
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendRange, setTrendRange] = useState<string>('past');

  const filteredTrendData = useMemo(() => {
    if (!data?.trend) return [];
    const currentMonth = dayjs().format('YYYY-MM');
    const currentIndex = data.trend.findIndex(t => t.month === currentMonth);
    
    if (trendRange === 'past') {
      // 过去 12 个月（含当月）
      return data.trend.slice(0, currentIndex + 1).slice(-12);
    } else {
      // 未来 12 个月（含当月）
      return data.trend.slice(currentIndex, currentIndex + 13);
    }
  }, [data?.trend, trendRange]);
  const [monthlyDetails, setMonthlyDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [filterMethod, setFilterMethod] = useState<string>('all');

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

  const fetchMonthlyDetails = async (yearMonth: string) => {
    setDetailsLoading(true);
    try {
      const { data } = await api.get(`/repayments/monthly/${yearMonth}`);
      setMonthlyDetails(data);
    } catch (error) {
      message.error('获取月度明细失败');
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchMonthlyDetails(dayjs().format('YYYY-MM'));
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

  // 计算饼图双层数据
  const innerPieData = monthlyDetails ? [
    { name: '先息后本', value: monthlyDetails.items.filter((r: any) => r.repayment_method === 'interest_first').reduce((sum: number, r: any) => sum + r.amount, 0), color: '#ff7a45' },
    { name: '等额类', value: monthlyDetails.items.filter((r: any) => r.repayment_method === 'equal_installment' && r.account_type === 'commercial_loan').reduce((sum: number, r: any) => sum + r.amount, 0), color: '#1890ff' },
    { name: '信用卡', value: monthlyDetails.items.filter((r: any) => r.account_type === 'credit_card').reduce((sum: number, r: any) => sum + r.amount, 0), color: '#52c41a' },
  ].filter(i => i.value > 0) : [];

  const outerPieData = monthlyDetails ? monthlyDetails.items.map((item: any) => ({
    name: item.account_name,
    value: item.amount,
    color: item.repayment_method === 'interest_first' ? '#ffbb96' : (item.account_type === 'credit_card' ? '#95de64' : '#69c0ff')
  })) : [];

  const filteredItems = monthlyDetails?.items.filter((item: any) => {
    if (filterMethod === 'all') return true;
    if (filterMethod === 'interest_first') return item.repayment_method === 'interest_first';
    if (filterMethod === 'equal') return item.repayment_method === 'equal_installment';
    return true;
  }) || [];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>仪表盘</Title>

      {/* 先息后本专项预警 */}
      {data.interestFirstAlerts.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {data.interestFirstAlerts.map(alert => (
            <Alert
              key={alert.id}
              message="先息后本到期预警"
              description={
                <div>
                  <Text strong>{alert.account_name}</Text> 将于 <Text type="danger" strong>{alert.due_date}</Text> 到期，需归还本金+利息合计 <Text type="danger" strong>￥{alert.amount.toLocaleString()}</Text>。
                  <Button type="link" size="small" onClick={() => handleMarkPaid(alert.id)}>去标记还款</Button>
                </div>
              }
              type="error"
              showIcon
              icon={<WarningOutlined />}
              style={{ marginBottom: 16, borderRadius: 8, borderLeft: '5px solid #ff4d4f' }}
            />
          ))}
        </div>
      )}

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
          <Card 
            title="还款趋势" 
            variant="borderless" 
            style={{ height: '100%' }}
            extra={
              <Segmented 
                options={[
                  { label: '过去12个月', value: 'past' },
                  { label: '未来12个月', value: 'future' }
                ]} 
                value={trendRange}
                onChange={(value) => setTrendRange(value as string)}
              />
            }
          >
            <div style={{ height: 350, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                  data={filteredTrendData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#303030' : '#f0f0f0'} />
                  <XAxis 
                    dataKey="month" 
                    stroke={isDarkMode ? '#8c8c8c' : '#595959'}
                    tick={({ x, y, payload }) => (
                      <g transform={`translate(${x},${y})`}>
                        <text 
                          x={0} 
                          y={0} 
                          dy={16} 
                          textAnchor="middle" 
                          fill={payload.value === dayjs().format('YYYY-MM') ? token.colorPrimary : (isDarkMode ? '#8c8c8c' : '#666')}
                          fontWeight={payload.value === dayjs().format('YYYY-MM') ? 'bold' : 'normal'}
                          fontSize={12}
                        >
                          {payload.value}
                        </text>
                      </g>
                    )}
                  />
                  <YAxis stroke={isDarkMode ? '#8c8c8c' : '#595959'} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => `￥${value.toLocaleString()}`}
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1f1f1f' : '#fff', 
                      borderColor: isDarkMode ? '#434343' : '#ccc',
                      borderRadius: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)'
                    }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        const isCurrent = label === dayjs().format('YYYY-MM');
                        return (
                          <div style={{ 
                            backgroundColor: isDarkMode ? '#1f1f1f' : '#fff', 
                            padding: '10px', 
                            border: `1px solid ${isDarkMode ? '#434343' : '#ccc'}`, 
                            borderRadius: '4px', 
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)' 
                          }}>
                            <p style={{ margin: 0, fontWeight: 'bold', color: isCurrent ? token.colorPrimary : (isDarkMode ? '#fff' : '#000') }}>
                              {label} {isCurrent && '(本月)'}
                            </p>
                            <p style={{ margin: 0, color: token.colorPrimary }}>总还款额: ￥{d.amount.toLocaleString()}</p>
                            <p style={{ margin: 0, color: '#fa8c16' }}>先息后本: ￥{d.interest_first_amount.toLocaleString()}</p>
                            <p style={{ margin: 0, color: '#b37feb' }}>其他方式: ￥{d.other_amount.toLocaleString()}</p>
                            {d.is_warning && (
                              <p style={{ margin: '5px 0 0', color: '#ff4d4f', fontWeight: 'bold' }}>
                                <WarningOutlined /> {d.warning_msg}
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  <Bar dataKey="amount" name="总还款额" fill={isDarkMode ? '#1d39c4' : '#e6f7ff'} barSize={40}>
                    { filteredTrendData.map((entry, index) => {
                      const isCurrent = entry.month === dayjs().format('YYYY-MM');
                      let fillColor = isDarkMode ? '#111d2c' : '#f5f5f5'; // 默认
                      let strokeColor = isDarkMode ? '#303030' : '#d9d9d9';

                      if (entry.is_warning) {
                        fillColor = isDarkMode ? '#58181c' : '#fff1f0';
                        strokeColor = '#ff4d4f';
                      } else if (isCurrent) {
                        fillColor = isDarkMode ? '#153450' : '#e6f7ff';
                        strokeColor = token.colorPrimary;
                      } else if (entry.is_future) {
                        fillColor = isDarkMode ? '#141414' : '#fafafa';
                        strokeColor = isDarkMode ? '#434343' : '#d9d9d9';
                      }

                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={fillColor} 
                          stroke={strokeColor}
                          strokeWidth={isCurrent ? 2 : 1}
                        />
                      );
                    })}
                  </Bar>
                  <Line type="monotone" dataKey="interest_first_amount" name="先息后本还款额" stroke="#fa8c16" strokeWidth={2} dot={{ r: 4, fill: '#fa8c16' }} />
                  <Line type="monotone" dataKey="other_amount" name="其他还款额" stroke="#b37feb" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: '#b37feb' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <Space split={<Divider type="vertical" />}>
                <Badge color="#1890ff" text="本月" />
                <Badge color="#ff4d4f" text="到期预警" />
                <Badge color="#d9d9d9" text="其他月份" />
              </Space>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="本月占比 (双层)" variant="borderless" style={{ height: '100%' }}>
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {/* 内层：还款方式聚合 */}
                  <Pie
                    data={innerPieData}
                    innerRadius={0}
                    outerRadius={60}
                    dataKey="value"
                    stroke="none"
                  >
                    {innerPieData.map((entry: any, index: number) => (
                      <Cell key={`inner-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  {/* 外层：具体账目 */}
                  <Pie
                    data={outerPieData}
                    innerRadius={70}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {outerPieData.map((entry: any, index: number) => (
                      <Cell key={`outer-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `￥${value.toLocaleString()}`} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Upcoming & Details */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} md={12}>
          <Card 
            title="当月还款明细" 
            variant="borderless"
            extra={
              <Segmented 
                options={[
                  { label: '全部', value: 'all' },
                  { label: '先息后本', value: 'interest_first' },
                  { label: '等额类', value: 'equal' }
                ]} 
                value={filterMethod}
                onChange={(v) => setFilterMethod(v as string)}
              />
            }
          >
            <Table 
              dataSource={filteredItems} 
              loading={detailsLoading}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                { 
                  title: '账目名称', 
                  key: 'account_name',
                  render: (_, record) => (
                    <div>
                      <Text strong>{record.account_name}</Text>
                      {record.repayment_method === 'interest_first' && (
                        <Tag color="orange" style={{ marginLeft: 8 }}>先息后本</Tag>
                      )}
                    </div>
                  )
                },
                { 
                  title: '还款金额', 
                  dataIndex: 'amount', 
                  key: 'amount',
                  render: (val, record) => {
                    const isLastPeriod = record.repayment_method === 'interest_first' && record.period_number === record.periods;
                    return (
                      <div>
                        <Text strong>￥{val.toLocaleString()}</Text>
                        <div style={{ fontSize: '11px', color: isDarkMode ? '#8c8c8c' : '#888' }}>
                          {isLastPeriod ? 
                            `(本金${(val - record.base_monthly_payment).toLocaleString()} + 利息${record.base_monthly_payment.toLocaleString()})` : 
                            (record.repayment_method === 'interest_first' ? '(仅利息)' : '')
                          }
                        </div>
                      </div>
                    );
                  }
                },
                { 
                  title: '状态', 
                  dataIndex: 'status', 
                  key: 'status',
                  render: (status) => <Tag color={status === 'paid' ? 'green' : 'orange'}>{status === 'paid' ? '已还' : '待还'}</Tag>
                },
                {
                  title: '操作',
                  key: 'action',
                  render: (_, record) => record.status === 'pending' && (
                    <Button type="link" size="small" onClick={() => handleMarkPaid(record.id)}>标记已还</Button>
                  )
                }
              ]}
              rowClassName={(record) => record.repayment_method === 'interest_first' ? 'interest-first-row' : ''}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="先息后本贷款总览" variant="borderless">
             <Row gutter={16}>
               <Col span={12}>
                 <Statistic title="总笔数" value={data.interestFirstSummary.total_count} suffix="笔" />
               </Col>
               <Col span={12}>
                 <Statistic title="活跃总额" value={data.interestFirstSummary.active_total_amount} precision={2} prefix="￥" />
               </Col>
             </Row>
             <div style={{ marginTop: 24 }}>
               <Alert
                message={`未来6个月内有 ${data.interestFirstSummary.upcoming_6_months} 笔先息后本贷款到期`}
                type={data.interestFirstSummary.upcoming_6_months > 0 ? "warning" : "info"}
                showIcon
                action={
                  <Button size="small" type="link">
                    <Link to="/loans">去管理</Link>
                  </Button>
                }
               />
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

      <style>{`
        .interest-first-row {
          background-color: ${isDarkMode ? '#2b2111' : '#fffbe6'} !important;
        }
        .interest-first-row:hover > td {
          background-color: ${isDarkMode ? '#3e2d16' : '#fff1b8'} !important;
        }
        .stat-card {
          box-shadow: ${isDarkMode ? '0 4px 12px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.05)'};
          background: ${isDarkMode ? '#1f1f1f' : '#fff'};
          border-radius: 8px;
        }
        .ant-table-wrapper .ant-table-thead > tr > th {
          background-color: ${isDarkMode ? '#1d1d1d' : '#fafafa'} !important;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
