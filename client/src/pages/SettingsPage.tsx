import React from 'react';
import { Card, Typography, List, Switch, Button, Divider } from 'antd';
import { GithubOutlined, UserOutlined, LockOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

const SettingsPage: React.FC = () => {
  const { username } = useAuth();

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title level={2}>设置</Title>
      
      <Card title={<span><UserOutlined /> 个人信息</span>} style={{ marginBottom: 24 }}>
        <List>
          <List.Item>
            <List.Item.Meta title="当前用户" description={username} />
          </List.Item>
          <List.Item>
            <List.Item.Meta title="账号状态" description="正常" />
          </List.Item>
        </List>
      </Card>

      <Card title={<span><LockOutlined /> 安全设置</span>} style={{ marginBottom: 24 }}>
        <List>
          <List.Item actions={[<Button type="link">修改密码</Button>]}>
            <List.Item.Meta title="登录密码" description="定期更换密码以保障账号安全" />
          </List.Item>
        </List>
      </Card>

      <Card title={<span><InfoCircleOutlined /> 关于 LoanVision</span>}>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Title level={4}>LoanVision v1.0.0</Title>
          <Text type="secondary">一款简洁、直观、高效的个人贷款与分期记账工具。</Text>
          <div style={{ marginTop: 24 }}>
             <Button icon={<GithubOutlined />} type="link" href="#">开源地址</Button>
          </div>
        </div>
        <Divider />
        <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center', display: 'block' }}>
          ©2026 LoanVision Project. All Rights Reserved.
        </Text>
      </Card>
    </div>
  );
};

export default SettingsPage;
