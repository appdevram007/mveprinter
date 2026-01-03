import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from '../Icon';
import { STATUS_COLORS } from '../../config/constants';

const OrderItem = ({ item, onUpdateStatus, onShowPreview, onPrint, useRealApi }) => {
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderNumber}>{item.orderNumber}</Text>
          <Text style={styles.customerName}>{item.customerName}</Text>
          {!useRealApi && (
            <Text style={styles.demoBadge}>DEMO</Text>
          )}
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: STATUS_COLORS[item.status] || STATUS_COLORS.default }
        ]}>
          <Text style={styles.statusText}>{item.status?.toUpperCase() || 'UNKNOWN'}</Text>
        </View>
      </View>
      
      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Icon name="time" size={14} color="#666" />
          <Text style={styles.detailText}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {item.tableNumber && (
            <>
              <Icon name="restaurant" size={14} color="#666" style={styles.iconSpacing} />
              <Text style={styles.detailText}>{item.tableNumber}</Text>
            </>
          )}
          <Icon name="cube" size={14} color="#666" style={styles.iconSpacing} />
          <Text style={styles.detailText}>{item.items?.length || 0} items</Text>
        </View>
        
        {item.customerPhone && (
          <Text style={styles.detailText}>
            <Icon name="call" size={14} color="#666" /> {item.customerPhone}
          </Text>
        )}
        
        <View style={styles.itemsPreview}>
          {item.items?.slice(0, 2).map((orderItem, index) => (
            <Text key={index} style={styles.itemPreviewText}>
              {orderItem.name} x{orderItem.quantity}
            </Text>
          ))}
          {item.items && item.items.length > 2 && (
            <Text style={styles.moreItemsText}>+{item.items.length - 2} more</Text>
          )}
        </View>
      </View>
      
      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>RM {item.total?.toFixed(2) || '0.00'}</Text>
        <View style={styles.actionButtons}>
          {item.status === 'pending' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.prepareButton]}
              onPress={() => onUpdateStatus(item.id, 'preparing')}
            >
              <Text style={styles.actionButtonText}>Start</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.actionButton, styles.previewButton]}
            onPress={() => onShowPreview(item)}
          >
            <Icon name="eye" size={16} color="white" />
            <Text style={styles.actionButtonText}>Preview</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.printButton]}
            onPress={() => onPrint(item)}
          >
            <Icon name="print" size={16} color="white" />
            <Text style={styles.actionButtonText}>Print</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  customerName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  demoBadge: {
    fontSize: 10,
    color: '#ff9800',
    fontWeight: 'bold',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  orderDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  iconSpacing: {
    marginLeft: 15,
  },
  itemsPreview: {
    marginTop: 8,
  },
  itemPreviewText: {
    fontSize: 12,
    color: '#555',
    marginBottom: 2,
  },
  moreItemsText: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 5,
  },
  prepareButton: {
    backgroundColor: '#ff9800',
  },
  previewButton: {
    backgroundColor: '#2196f3',
  },
  printButton: {
    backgroundColor: '#4caf50',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default OrderItem;