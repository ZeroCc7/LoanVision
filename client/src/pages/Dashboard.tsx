import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Statistic, Table, Typography, Button, App, Alert, Badge, Segmented, Tag, Modal, Form, Input, InputNumber, DatePicker, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
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
import { CreditCardOutlined, BankOutlined, WarningOutlined, PlusOutlined, HistoryOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface TrendItem {
  month: string; 
  amount: number;
  interest_first_amount: number;
  other_amount: number;
  is_warning: boolean;
  warning_msg: string;
  is_future?: boolean;
}

interface RepaymentItem {
  id: number;
  account_id: number;
  account_name: string;
  account_type: 'credit_card' | 'commercial_loan';
  repayment_method: 'equal_installment' | 'interest_first';
  amount: number;
  period_number: number;
  periods: number;
  due_date: string;
  status: 'pending' | 'paid';
  base_monthly_payment: number;
}

interface DashboardData {
  summary: {
    total_monthly: number;
    paid_monthly: number;
    pending_monthly: number;
    total_remaining: number;
    active_accounts: number;
    total_items: number;
  };
  trend: TrendItem[];
  upcoming: any[];
  interestFirstAlerts: any[];
  interestFirstSummary: {
    total_count: number;
    total_amount: number;
    active_total_amount: number;
    upcoming_6_months: number;
  };
}

const Dashboard: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  
  // 固定为深色科技感模式
  const isDarkMode = true;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendRange, setTrendRange] = useState<string>('future');
  const [selectedMonth, setSelectedMonth] = useState<string>(dayjs().format('YYYY-MM'));
  const [isQuickRecordModalVisible, setIsQuickRecordModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 定义霓虹特效颜色
  const colors = {
    cyan: '#00d2ff',
    magenta: '#ff00ff',
    lime: '#39ff14',
    orange: '#ff9d00',
    red: '#ff4d4f',
    blue: '#1890ff',
    purple: '#9254de',
    gold: '#ffd700',
    pink: '#ff85c0',
    mint: '#00fac9'
  };

  const filteredTrendData = useMemo(() => {
    if (!data?.trend) return [];
    const currentMonth = dayjs().format('YYYY-MM');
    const currentIndex = data.trend.findIndex(t => t.month === currentMonth);
    
    let result: TrendItem[];
    if (trendRange === 'past') {
      // 过去 12 个月（含当月）
      result = data.trend.slice(0, currentIndex + 1).slice(-12);
    } else {
      // 未来 12 个月（含当月）
      result = data.trend.slice(currentIndex, currentIndex + 13);
    }

    return result.map(item => ({
      ...item,
      is_selected: item.month === selectedMonth,
      is_future: dayjs(item.month).isAfter(currentMonth, 'month')
    }));
  }, [data?.trend, trendRange, selectedMonth]);
  const [monthlyDetails, setMonthlyDetails] = useState<{ items: RepaymentItem[] } | null>(null);
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

  const handleQuickRecord = async (values: any) => {
    try {
      await api.post('/accounts', values);
      message.success('记录成功');
      setIsQuickRecordModalVisible(false);
      form.resetFields();
      fetchDashboardData();
    } catch (error) {
      message.error('记录失败');
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
  }, []);

  useEffect(() => {
    fetchMonthlyDetails(selectedMonth);
  }, [selectedMonth]);

  const handleMarkPaid = async (repaymentId: number) => {
    try {
      await api.patch(`/repayments/${repaymentId}`, { status: 'paid' });
      message.success('标记成功');
      fetchDashboardData();
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 计算饼图数据
  const innerPieData = useMemo(() => {
    if (!monthlyDetails) return [];
    return [
      { name: '先息后本', value: monthlyDetails.items.filter((r: RepaymentItem) => r.repayment_method === 'interest_first').reduce((sum: number, r: RepaymentItem) => sum + r.amount, 0), color: colors.orange },
      { name: '等额类', value: monthlyDetails.items.filter((r: RepaymentItem) => r.repayment_method === 'equal_installment' && r.account_type === 'commercial_loan').reduce((sum: number, r: RepaymentItem) => sum + r.amount, 0), color: colors.mint },
      { name: '信用卡', value: monthlyDetails.items.filter((r: RepaymentItem) => r.account_type === 'credit_card').reduce((sum: number, r: RepaymentItem) => sum + r.amount, 0), color: colors.pink },
    ].filter(i => i.value > 0);
  }, [monthlyDetails, colors.orange, colors.mint, colors.pink]);

  const outerPieData = useMemo(() => {
    if (!monthlyDetails) return [];
    // 预定义一套互不重复的颜色池
    const colorPool = [
      colors.cyan, colors.magenta, colors.lime, colors.blue, 
      colors.purple, colors.gold, colors.red, colors.mint, colors.pink
    ];
    
    return monthlyDetails.items.map((item: RepaymentItem, index: number) => ({
      name: item.account_name,
      value: item.amount,
      color: colorPool[index % colorPool.length]
    }));
  }, [monthlyDetails, colors.cyan, colors.magenta, colors.lime, colors.blue, colors.purple, colors.gold, colors.red, colors.mint, colors.pink]);

  const filteredItems = useMemo(() => {
    if (!monthlyDetails?.items) return [];
    return monthlyDetails.items.filter((item: RepaymentItem) => {
      if (filterMethod === 'all') return true;
      if (filterMethod === 'interest_first') return item.repayment_method === 'interest_first';
      if (filterMethod === 'equal') return item.repayment_method === 'equal_installment';
      return true;
    });
  }, [monthlyDetails?.items, filterMethod]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: 16 }}>
        <Badge status="processing" text="正在加载统计数据..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Alert
          message="无法获取数据"
          description="获取统计数据失败，请检查网络连接或尝试重新登录。"
          type="error"
          showIcon
          action={
            <Button size="small" type="primary" onClick={() => fetchDashboardData()}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  const columns: ColumnsType<RepaymentItem> = [
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
            <Text strong style={{ color: colors.cyan }}>￥{val.toLocaleString()}</Text>
            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
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
  ];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Title level={4} style={{ margin: 0, letterSpacing: '1px' }}>数据概览</Title>
          <Tag color="blue" style={{ borderRadius: '2px', background: 'rgba(0, 210, 255, 0.1)', border: '1px solid rgba(0, 210, 255, 0.3)', color: colors.cyan }}>
            {selectedMonth}
          </Tag>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          size="middle"
          onClick={() => setIsQuickRecordModalVisible(true)}
          style={{ borderRadius: '4px', boxShadow: '0 0 15px rgba(0, 210, 255, 0.3)' }}
        >
          快捷记录
        </Button>
      </div>

      {/* 快捷导航 */}
      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card 
            hoverable 
            size="small"
            style={{ textAlign: 'center', borderRadius: '8px', background: 'rgba(0, 210, 255, 0.05)', border: '1px solid rgba(0, 210, 255, 0.1)' }} 
            onClick={() => navigate('/credit-cards')}
          >
            <CreditCardOutlined style={{ fontSize: 20, color: colors.cyan, marginBottom: 4 }} />
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>信用卡分期</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card 
            hoverable 
            size="small"
            style={{ textAlign: 'center', borderRadius: '8px', background: 'rgba(57, 255, 20, 0.05)', border: '1px solid rgba(57, 255, 20, 0.1)' }} 
            onClick={() => navigate('/loans')}
          >
            <BankOutlined style={{ fontSize: 20, color: colors.lime, marginBottom: 4 }} />
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>商业贷款</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card 
            hoverable 
            size="small"
            style={{ textAlign: 'center', borderRadius: '8px', background: 'rgba(255, 157, 0, 0.05)', border: '1px solid rgba(255, 157, 0, 0.1)' }} 
            onClick={() => navigate('/history')}
          >
            <HistoryOutlined style={{ fontSize: 20, color: colors.orange, marginBottom: 4 }} />
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>还款历史</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card 
            hoverable 
            size="small"
            style={{ textAlign: 'center', borderRadius: '8px', background: 'rgba(255, 77, 79, 0.05)', border: '1px solid rgba(255, 77, 79, 0.1)' }} 
            onClick={() => navigate('/settings')}
          >
            <SettingOutlined style={{ fontSize: 20, color: colors.red, marginBottom: 4 }} />
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>系统设置</div>
          </Card>
        </Col>
      </Row>

      {/* Summary Cards */}
      <Row gutter={[8, 8]}>
        <Col xs={24} sm={12} md={6}>
          <Card 
            variant="borderless" 
            size="small"
            style={{ 
              background: 'linear-gradient(135deg, #001529 0%, #003366 100%)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 210, 255, 0.3)',
              boxShadow: '0 0 15px rgba(0, 210, 255, 0.2)'
            }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>本月总应还</span>}
              value={data.summary.total_monthly}
              precision={2}
              prefix={<span style={{ color: colors.cyan, fontSize: 14 }}>￥</span>}
              styles={{ content: { color: colors.cyan, fontSize: '20px', fontWeight: 'bold', fontFamily: 'Monospace', textShadow: `0 0 10px ${colors.cyan}66` } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card 
            variant="borderless"
            size="small"
            style={{ 
              background: 'linear-gradient(135deg, #092b00 0%, #135200 100%)',
              borderRadius: '8px',
              border: '1px solid rgba(57, 255, 20, 0.3)',
              boxShadow: '0 0 15px rgba(57, 255, 20, 0.2)'
            }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>本月已还</span>}
              value={data.summary.paid_monthly}
              precision={2}
              prefix={<span style={{ color: colors.lime, fontSize: 14 }}>￥</span>}
              styles={{ content: { color: colors.lime, fontSize: '20px', fontWeight: 'bold', fontFamily: 'Monospace', textShadow: `0 0 10px ${colors.lime}66` } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card 
            variant="borderless"
            size="small"
            style={{ 
              background: 'linear-gradient(135deg, #442a00 0%, #874d00 100%)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 157, 0, 0.3)',
              boxShadow: '0 0 15px rgba(255, 157, 0, 0.2)'
            }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>本月待还</span>}
              value={data.summary.pending_monthly}
              precision={2}
              prefix={<span style={{ color: colors.orange, fontSize: 14 }}>￥</span>}
              styles={{ content: { color: colors.orange, fontSize: '20px', fontWeight: 'bold', fontFamily: 'Monospace', textShadow: `0 0 10px ${colors.orange}66` } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card 
            variant="borderless"
            size="small"
            style={{ 
              background: 'linear-gradient(135deg, #430000 0%, #820000 100%)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 77, 79, 0.3)',
              boxShadow: '0 0 15px rgba(255, 77, 79, 0.2)'
            }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>总剩余待还</span>}
              value={data.summary.total_remaining}
              precision={2}
              prefix={<span style={{ color: colors.red, fontSize: 14 }}>￥</span>}
              styles={{ content: { color: colors.red, fontSize: '20px', fontWeight: 'bold', fontFamily: 'Monospace', textShadow: `0 0 10px ${colors.red}66` } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts Section */}
      <Row gutter={[8, 8]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card 
            title={<span style={{ fontSize: 14 }}>还款趋势分析</span>}
            variant="borderless" 
            size="small"
            style={{ height: '100%', background: isDarkMode ? 'rgba(0, 20, 40, 0.2)' : '#fff' }}
            extra={
              <Segmented 
                size="small"
                options={[
                  { label: '过去', value: 'past' },
                  { label: '未来', value: 'future' }
                ]} 
                value={trendRange}
                onChange={(value) => setTrendRange(value as string)}
              />
            }
          >
            <div style={{ height: 280, width: '100%', minHeight: 280 }}>
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <ComposedChart 
                  data={filteredTrendData} 
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  onClick={(data) => {
                    if (data && data.activeLabel) {
                      setSelectedMonth(String(data.activeLabel));
                    }
                  }}
                >
                  <defs>
                    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.cyan} stopOpacity={0.8}/>
                      <stop offset="100%" stopColor={colors.cyan} stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="warningGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.red} stopOpacity={0.8}/>
                      <stop offset="100%" stopColor={colors.red} stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f1f" />
                  <XAxis 
                    dataKey="month" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.65)' }}
                  />
                  <YAxis 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.65)' }}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div style={{ 
                            backgroundColor: 'rgba(0, 20, 40, 0.95)',
                            borderRadius: '4px',
                            border: '1px solid rgba(0, 210, 255, 0.5)',
                            padding: '10px',
                            boxShadow: '0 0 15px rgba(0, 210, 255, 0.2)',
                            color: '#fff'
                          }}>
                            <div style={{ marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px', fontWeight: 'bold', color: colors.cyan }}>
                              {label}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.7)' }}>总计还款:</span>
                                <span style={{ color: colors.cyan, fontWeight: 'bold', fontFamily: 'Monospace' }}>￥{data.amount.toLocaleString()}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.7)' }}>先息后本:</span>
                                <span style={{ color: colors.orange, fontFamily: 'Monospace' }}>￥{data.interest_first_amount.toLocaleString()}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.7)' }}>其他还款:</span>
                                <span style={{ color: colors.lime, fontFamily: 'Monospace' }}>￥{data.other_amount.toLocaleString()}</span>
                              </div>
                              {data.is_warning && (
                                <div style={{ marginTop: '8px', padding: '4px 8px', background: 'rgba(255, 77, 79, 0.1)', border: '1px solid rgba(255, 77, 79, 0.3)', borderRadius: '2px', color: colors.red, fontSize: '11px' }}>
                                  <WarningOutlined style={{ marginRight: '4px' }} />
                                  {data.warning_msg}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                    cursor={{ fill: 'rgba(0, 210, 255, 0.05)' }}
                  />
                  <Bar dataKey="amount" name="总还款额" barSize={30}>
                    { filteredTrendData.map((entry, index) => {
                      const isCurrent = entry.month === dayjs().format('YYYY-MM');
                      let fillColor = 'url(#barGradient)';
                      let strokeColor = colors.cyan;

                      if (entry.is_warning) {
                        fillColor = 'url(#warningGradient)';
                        strokeColor = colors.red;
                      } else if (entry.is_selected) {
                        fillColor = 'url(#barGradient)';
                        strokeColor = '#fff'; // 选中状态显示白边
                      } else if (isCurrent) {
                        fillColor = 'url(#barGradient)';
                        strokeColor = colors.cyan;
                      }

                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={fillColor} 
                          stroke={strokeColor}
                          strokeWidth={entry.is_selected || isCurrent ? 2 : 1}
                          filter={entry.is_selected || isCurrent || entry.is_warning ? "url(#neonGlow)" : "none"}
                          style={{ cursor: 'pointer' }}
                        />
                      );
                    })}
                  </Bar>
                  <Line 
                    type="monotone" 
                    dataKey="interest_first_amount" 
                    name="先息后本" 
                    stroke={colors.orange} 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: colors.orange, stroke: colors.orange, filter: "url(#neonGlow)" }}
                    filter="url(#neonGlow)"
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle" 
                    wrapperStyle={{ fontSize: '10px', color: '#fff' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card 
            title={<span style={{ fontSize: 14 }}>{selectedMonth} 构成分析</span>} 
            variant="borderless" 
            size="small" 
            style={{ height: '100%', background: isDarkMode ? 'rgba(0, 20, 40, 0.2)' : '#fff' }}
          >
            <div style={{ height: 280, minHeight: 280 }}>
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <PieChart>
                  <defs>
                    <filter id="neonGlowPie" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>
                  <Pie
                    data={innerPieData}
                    innerRadius={0}
                    outerRadius={50}
                    dataKey="value"
                    stroke="none"
                  >
                    {innerPieData.map((entry: any, index: number) => (
                      <Cell key={`inner-cell-${index}`} fill={entry.color} fillOpacity={0.8} filter="url(#neonGlowPie)" />
                    ))}
                  </Pie>
                  <Pie
                    data={outerPieData}
                    innerRadius={60}
                    outerRadius={85}
                    dataKey="value"
                    label={({ percent }) => `${(Number(percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                    stroke="none"
                  >
                    {outerPieData.map((entry: any, index: number) => (
                      <Cell key={`outer-cell-${index}`} fill={entry.color} fillOpacity={0.6} filter="url(#neonGlowPie)" />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => `￥${Number(value).toLocaleString()}`}
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 20, 40, 0.95)',
                      borderRadius: '4px',
                      border: '1px solid rgba(0, 210, 255, 0.5)',
                      fontSize: '12px',
                      color: '#fff',
                      boxShadow: '0 0 10px rgba(0, 210, 255, 0.2)'
                    }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '4px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Upcoming & Details */}
      <Row gutter={[8, 8]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card 
            title={<span style={{ fontSize: 14 }}>{selectedMonth} 还款计划明细</span>} 
            variant="borderless"
            size="small"
            style={{ background: isDarkMode ? 'rgba(0, 20, 40, 0.2)' : '#fff' }}
            extra={
              <Segmented 
                size="small"
                options={[
                  { label: '全部', value: 'all' },
                  { label: '先息后本', value: 'interest_first' },
                  { label: '等额', value: 'equal' }
                ]} 
                value={filterMethod}
                onChange={(value) => setFilterMethod(value as string)}
              />
            }
          >
            <Table 
              columns={columns} 
              dataSource={filteredItems} 
              rowKey="id" 
              size="small"
              loading={detailsLoading}
              pagination={false}
              scroll={{ x: 'max-content' }}
              style={{ fontSize: '12px' }}
            />
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
        .recharts-default-tooltip {
          background-color: rgba(0, 20, 40, 0.95) !important;
          border: 1px solid rgba(0, 210, 255, 0.5) !important;
        }
        .recharts-tooltip-item-list {
          color: #fff !important;
        }
        .recharts-pie-label-text {
          fill: #fff !important;
        }
      `}</style>
      {/* Quick Record Modal */}
      <Modal
        title="快捷记录"
        open={isQuickRecordModalVisible}
        onCancel={() => setIsQuickRecordModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleQuickRecord}
          initialValues={{
            type: 'credit_card',
            repayment_method: 'equal_installment',
            start_date: dayjs(),
          }}
        >
          <Form.Item name="name" label="账目名称" rules={[{ required: true }]}>
            <Input placeholder="例如：招商银行信用卡" />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select options={[
              { label: '信用卡分期', value: 'credit_card' },
              { label: '商业贷款', value: 'commercial_loan' }
            ]} />
          </Form.Item>
          <Form.Item name="repayment_method" label="还款方式" rules={[{ required: true }]}>
            <Select options={[
              { label: '等额本息/本金', value: 'equal_installment' },
              { label: '先息后本', value: 'interest_first' }
            ]} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="total_amount" label="总金额" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} prefix="￥" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="periods" label="总期数" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="start_date" label="开始日期" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="payment_day" label="每月还款日" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} max={31} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              提交记录
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Dashboard;
