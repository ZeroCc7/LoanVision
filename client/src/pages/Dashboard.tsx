import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Statistic, Table, Typography, Button, App, Alert, Badge, Segmented, Tag, Modal, Form, Input, InputNumber, DatePicker, Select, Calendar } from 'antd';
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
import { CreditCardOutlined, BankOutlined, WarningOutlined, PlusOutlined, HistoryOutlined, SettingOutlined, UnorderedListOutlined, CalendarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import dayjs from 'dayjs';

const { Title } = Typography;

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
    total_overdue?: number;
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
  
  // 处理响应式数据
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 576;

  // 固定为深色科技感模式
  const isDarkMode = true;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendRange, setTrendRange] = useState<string>('future');
  const [selectedMonth, setSelectedMonth] = useState<string>(dayjs().format('YYYY-MM'));
  const [isQuickRecordModalVisible, setIsQuickRecordModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
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
      const { total_amount, periods, start_date } = values;
      // 简单计算每月还款额：总额 / 期数
      const monthly_payment = total_amount / periods;
      
      const payload = {
        ...values,
        monthly_payment,
        start_date: start_date.format('YYYY-MM-DD')
      };

      await api.post('/accounts', payload);
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

  const columns: ColumnsType<RepaymentItem> = useMemo(() => [
    {
      title: '还款日期',
      dataIndex: 'due_date',
      key: 'due_date',
      width: isMobile ? 100 : 110,
      render: (date: string) => dayjs(date).format('MM-DD'),
      sorter: (a: any, b: any) => dayjs(a.due_date).unix() - dayjs(b.due_date).unix(),
    },
    {
      title: '账目名称',
      key: 'account_name',
      ellipsis: true,
      width: isMobile ? 100 : 120,
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 'bold', color: 'rgba(255,255,255,0.85)' }}>{record.account_name}</span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>{record.account_type === 'credit_card' ? '信用卡' : '商贷'}</span>
        </div>
      )
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: isMobile ? 80 : 100,
      render: (amount: number) => (
        <span style={{ color: colors.cyan, fontWeight: 'bold', fontFamily: 'Monospace' }}>
          {amount.toLocaleString()}
        </span>
      ),
      sorter: (a: any, b: any) => a.amount - b.amount,
    },
    {
      title: '期数',
      dataIndex: 'period_number',
      key: 'period_number',
      width: 70,
      render: (val, record) => (
        <span style={{ fontSize: '12px' }}>{val}/{record.periods}</span>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: isMobile ? 70 : 90,
      render: (status: string) => {
        const config = {
          pending: { color: 'gold', text: '待还' },
          paid: { color: 'green', text: '已还' },
          overdue: { color: 'red', text: '逾期' },
        }[status as 'pending' | 'paid' | 'overdue'] || { color: 'default', text: status };
        return <Tag color={config.color} style={{ margin: 0, fontSize: '11px' }}>{config.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: isMobile ? 60 : 80,
      fixed: 'right',
      render: (_, record) => (
        <Button 
          type="link" 
          size="small" 
          onClick={() => handleMarkPaid(record.id)}
          disabled={record.status === 'paid'}
          style={{ padding: 0 }}
        >
          {record.status === 'paid' ? '已清' : '还款'}
        </Button>
      ),
    },
  ], [isMobile, colors.cyan]);

  // 汇总卡片组件，适配移动端
  const SummaryCard = ({ title, value, icon, color, precision = 2, bgGradient }: any) => (
    <Card 
      variant="borderless" 
      size="small"
      style={{ 
        background: bgGradient,
        borderRadius: '8px',
        border: `1px solid ${color}4d`,
        boxShadow: `0 0 15px ${color}33`
      }}
      bodyStyle={{ padding: isMobile ? '12px' : '16px' }}
    >
      <Statistic
        title={<span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>{icon}{title}</span>}
        value={value}
        precision={precision}
        prefix={<span style={{ color, fontSize: 14 }}>￥</span>}
        styles={{ content: { color, fontSize: isMobile ? '18px' : '20px', fontWeight: 'bold', fontFamily: 'Monospace', textShadow: `0 0 10px ${color}66` } }}
      />
    </Card>
  );

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

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: isMobile ? '4px' : '0' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: '12px'
      }}>
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
          style={{ 
            borderRadius: '4px', 
            boxShadow: '0 0 15px rgba(0, 210, 255, 0.3)',
            width: isMobile ? '100%' : 'auto'
          }}
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
        <Col xs={12} sm={12} md={6}>
          <SummaryCard 
            title="本月总应还" 
            value={data.summary.total_monthly} 
            icon={<CreditCardOutlined />} 
            color={colors.cyan} 
            bgGradient="linear-gradient(135deg, #001529 0%, #003366 100%)"
          />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <SummaryCard 
            title="本月已还" 
            value={data.summary.paid_monthly} 
            icon={<BankOutlined />} 
            color={colors.lime} 
            bgGradient="linear-gradient(135deg, #092b00 0%, #135200 100%)"
          />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <SummaryCard 
            title="本月待还" 
            value={data.summary.pending_monthly} 
            icon={<WarningOutlined />} 
            color={colors.orange} 
            bgGradient="linear-gradient(135deg, #442a00 0%, #874d00 100%)"
          />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <SummaryCard 
            title="逾期总额" 
            value={data.summary.total_overdue || 0} 
            icon={<HistoryOutlined />} 
            color={colors.red} 
            bgGradient="linear-gradient(135deg, #430000 0%, #820000 100%)"
          />
        </Col>
      </Row>

      {/* Charts Section */}
      <Row gutter={[8, 8]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: isMobile ? 14 : 16 }}>
                  <HistoryOutlined /> 还款趋势分析
                </span>
                <Segmented 
                  size="small"
                  options={[
                    { label: '过去', value: 'past' },
                    { label: '未来', value: 'future' }
                  ]}
                  value={trendRange}
                  onChange={(value) => setTrendRange(value as string)}
                  style={{ background: 'rgba(0, 210, 255, 0.1)', color: colors.cyan }}
                />
              </div>
            }
            variant="borderless" 
            size="small"
            style={{ height: '100%', background: isDarkMode ? 'rgba(0, 20, 40, 0.2)' : '#fff' }}
            bodyStyle={{ padding: isMobile ? '8px' : '16px' }}
          >
            <div style={{ height: isMobile ? 220 : 280, width: '100%', minHeight: isMobile ? 220 : 280 }}>
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <ComposedChart 
                  data={filteredTrendData} 
                  margin={{ top: 10, right: 10, left: isMobile ? -30 : -20, bottom: 0 }}
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
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ color: colors.magenta, fontSize: isMobile ? 14 : 16 }}>
                  <CreditCardOutlined /> {selectedMonth} 构成分析
                </span>
                <Tag color="blue" style={{ margin: 0 }}>
                  共 {outerPieData.length} 项
                </Tag>
              </div>
            }
            variant="borderless" 
            size="small" 
            style={{ height: '100%', background: isDarkMode ? 'rgba(0, 20, 40, 0.2)' : '#fff' }}
            bodyStyle={{ padding: isMobile ? '8px' : '16px' }}
          >
            <div style={{ height: isMobile ? 240 : 280, width: '100%' }}>
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
                    outerRadius={isMobile ? 40 : 50}
                    dataKey="value"
                    stroke="none"
                    cx="50%"
                    cy="45%"
                  >
                    {innerPieData.map((entry: any, index: number) => (
                      <Cell key={`inner-cell-${index}`} fill={entry.color} fillOpacity={0.8} filter="url(#neonGlowPie)" />
                    ))}
                  </Pie>
                  <Pie
                    data={outerPieData}
                    innerRadius={isMobile ? 50 : 60}
                    outerRadius={isMobile ? 70 : 85}
                    dataKey="value"
                    label={({ percent }) => `${(Number(percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                    stroke="none"
                    cx="50%"
                    cy="45%"
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
                  <Legend 
                    verticalAlign="bottom" 
                    height={isMobile ? 60 : 36}
                    iconType="circle"
                    formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: isMobile ? '11px' : '12px' }}>{value}</span>}
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
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
                <Segmented
                  size="small"
                  options={[
                    { value: 'list', icon: <UnorderedListOutlined /> },
                    { value: 'calendar', icon: <CalendarOutlined /> }
                  ]}
                  value={viewMode}
                  onChange={(value) => setViewMode(value as 'list' | 'calendar')}
                />
              </div>
            }
          >
            {viewMode === 'list' ? (
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
            ) : (
              <div className="calendar-container">
                <Calendar 
                  fullscreen={false} 
                  value={dayjs(selectedMonth)}
                  headerRender={() => null} // 隐藏自带头部，由外部 selectedMonth 控制
                  cellRender={(current) => {
                    const dateStr = current.format('YYYY-MM-DD');
                    const items = filteredItems.filter(item => item.due_date === dateStr);
                    if (items.length === 0) return null;
                    return (
                      <div className="daily-items-wrapper" style={{ marginTop: '0px', maxHeight: isMobile ? '40px' : '55px', overflowY: 'auto', overflowX: 'hidden' }}>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                          {items.map(item => (
                            <li key={item.id} style={{ 
                              fontSize: '10px', 
                              lineHeight: '1.4',
                              marginBottom: '1px',
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis' 
                            }}>
                              <Badge 
                                status={item.status === 'paid' ? 'success' : 'warning'} 
                                text={<span style={{ color: item.repayment_method === 'interest_first' ? colors.orange : colors.cyan, fontSize: '9px' }}>{item.account_name}</span>} 
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  }}
                />
              </div>
            )}
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
        .calendar-container .ant-picker-calendar {
          background: transparent !important;
        }
        .calendar-container .ant-picker-calendar-header {
          padding: 0 !important;
          margin-bottom: 4px !important;
        }
        .calendar-container .ant-picker-content {
          width: 100% !important;
        }
        .calendar-container .ant-picker-cell-inner {
          min-width: auto !important;
          padding: 0 !important;
        }
        .calendar-container .ant-picker-cell {
          padding: 0 !important;
          color: rgba(255,255,255,0.45) !important;
        }
        .calendar-container .ant-picker-cell-in-view {
          color: rgba(255,255,255,0.85) !important;
        }
        .calendar-container .ant-picker-cell-selected .ant-picker-calendar-date {
          background: rgba(0, 210, 255, 0.08) !important;
          border: 1px solid ${colors.cyan}88 !important;
          box-shadow: inset 0 0 8px rgba(0, 210, 255, 0.15) !important;
        }
        .calendar-container .ant-picker-calendar-date {
          border: 1px solid transparent;
          transition: all 0.3s;
          margin: 0 !important;
          padding: 2px 4px !important;
          height: ${isMobile ? '70px' : '90px'} !important;
          display: flex;
          flex-direction: column;
        }
        .daily-items-wrapper::-webkit-scrollbar {
          width: 3px;
        }
        .daily-items-wrapper::-webkit-scrollbar-track {
          background: transparent;
        }
        .daily-items-wrapper::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .daily-items-wrapper::-webkit-scrollbar-thumb:hover {
          background: ${colors.cyan}66;
        }
        .calendar-container .ant-picker-calendar-date-content {
          flex: 1;
          overflow: hidden;
        }
        .calendar-container .ant-picker-calendar-date:hover {
          background: rgba(255,255,255,0.05) !important;
        }
        .calendar-container .ant-picker-calendar-date-value {
          color: inherit !important;
          line-height: 1 !important;
          margin-bottom: 2px;
          font-size: 12px;
        }
        .calendar-container .ant-picker-cell-today .ant-picker-calendar-date {
          border-color: rgba(0, 210, 255, 0.4) !important;
          background: rgba(0, 210, 255, 0.05) !important;
        }
        .calendar-container .ant-picker-cell-today .ant-picker-calendar-date-value {
          color: ${colors.cyan} !important;
          font-weight: bold;
          position: relative;
          display: inline-block;
        }
        .calendar-container .ant-picker-cell-today .ant-picker-calendar-date-value::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 100%;
          height: 2px;
          background: ${colors.cyan};
          box-shadow: 0 0 5px ${colors.cyan};
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
