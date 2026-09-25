package com.gresseymusic.wave.ui.components

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography

/**
 * Shared confirmation dialog (M20). Floating FreQ glass with a title,
 * message, and two explicit actions. The confirm action renders in the
 * error role only when [destructive] — destructive styling is reserved for
 * actions that actually destroy user data or session state.
 */
@Composable
fun FreqConfirmDialog(
    title: String,
    message: String,
    confirmText: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    dismissText: String = "Cancel",
    destructive: Boolean = false,
) {
    val colors = FreqTheme.colors
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(onClick = onConfirm) {
                Text(
                    text = confirmText,
                    style = Typography.labelLarge,
                    color = if (destructive) colors.error else colors.textPrimary,
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(
                    text = dismissText,
                    style = Typography.labelLarge,
                    color = colors.textSecondary,
                )
            }
        },
        title = {
            Text(
                text = title,
                style = Typography.titleLarge,
                color = colors.textPrimary,
            )
        },
        text = {
            Text(
                text = message,
                style = Typography.bodyMedium,
                color = colors.textSecondary,
            )
        },
        modifier = modifier,
        shape = FreqShapes.dialog,
        containerColor = colors.glassFloating,
        tonalElevation = 0.dp,
    )
}
