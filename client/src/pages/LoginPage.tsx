import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, App } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', values);
      login(data.token, data.username);
      message.success('登录成功');
      navigate('/');
    } catch (error: any) {
      message.error(error.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      background: 'radial-gradient(circle at 50% 50%, #001529 0%, #000814 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 科技感背景装饰 */}
      <div style={{
        position: 'absolute',
        width: '200%',
        height: '200%',
        top: '-50%',
        left: '-50%',
        background: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(0, 210, 255, 0.03) 40px, rgba(0, 210, 255, 0.03) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(0, 210, 255, 0.03) 40px, rgba(0, 210, 255, 0.03) 41px)',
        transform: 'rotate(15deg)',
        zIndex: 0
      }} />

      {/* 动态光晕 */}
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        background: 'rgba(0, 210, 255, 0.05)',
        filter: 'blur(100px)',
        borderRadius: '50%',
        top: '10%',
        right: '10%',
        zIndex: 0,
        animation: 'pulse 10s infinite alternate'
      }} />

      <Card 
        variant="borderless"
        style={{ 
          width: 360, 
          borderRadius: 8,
          background: 'rgba(0, 20, 40, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid #00d2ff33',
          boxShadow: '0 0 30px rgba(0, 210, 255, 0.1)',
          zIndex: 1
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ 
            width: 48, 
            height: 48, 
            background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'white',
            margin: '0 auto 16px',
            fontSize: 24,
            fontWeight: 'bold',
            boxShadow: '0 0 20px rgba(0, 210, 255, 0.5)'
          }}>L</div>
          <Title level={3} style={{ margin: 0, letterSpacing: '2px', color: '#00d2ff' }}>
            LoanVision
          </Title>
          <Text type="secondary" style={{ fontSize: 12, letterSpacing: '1px' }}>智见负债 · 极简未来</Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: '#00d2ff' }} />} 
              placeholder="用户名" 
              style={{ borderRadius: 4, background: 'rgba(0,0,0,0.2)' }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password 
              prefix={<LockOutlined style={{ color: '#00d2ff' }} />} 
              placeholder="密码"
              style={{ borderRadius: 4, background: 'rgba(0,0,0,0.2)' }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              block
              style={{ 
                height: 45, 
                borderRadius: 4, 
                background: 'linear-gradient(90deg, #00d2ff 0%, #3a7bd5 100%)',
                border: 'none',
                fontWeight: 'bold',
                boxShadow: '0 4px 15px rgba(0, 210, 255, 0.3)'
              }}
            >
              登 录
            </Button>
          </Form.Item>
        </Form>
      </Card>
      
      <div style={{ marginTop: 24, color: 'rgba(255,255,255,0.3)', fontSize: 12, zIndex: 1 }}>
        LoanVision System v2.0.0
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.2); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
